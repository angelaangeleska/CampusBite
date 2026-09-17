from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import ALLOWED_TRANSITIONS, OrderCreate, OrderItemIn, OrderStatus, notification_message


def test_order_requires_a_name() -> None:
    with pytest.raises(ValidationError):
        OrderCreate(items=[OrderItemIn(menu_item_id="abc", qty=1)], customer_name="  ")


def test_order_requires_at_least_one_item() -> None:
    with pytest.raises(ValidationError):
        OrderCreate(items=[], customer_name="Ana")


def test_kitchen_can_accept_or_deny_pending() -> None:
    assert OrderStatus.accepted in ALLOWED_TRANSITIONS[OrderStatus.pending]
    assert OrderStatus.denied in ALLOWED_TRANSITIONS[OrderStatus.pending]
    assert OrderStatus.picked_up not in ALLOWED_TRANSITIONS[OrderStatus.pending]


def test_denied_order_has_no_next_status() -> None:
    assert ALLOWED_TRANSITIONS[OrderStatus.denied] == set()


def test_notification_message_for_new_order() -> None:
    assert "Ana" in notification_message(OrderStatus.pending, "Ana")


def test_health_ok() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            ping.return_value = None
            with TestClient(app) as client:
                response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "order-service"}


def test_health_when_database_is_down() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            ping.side_effect = RuntimeError("mongo down")
            with TestClient(app) as client:
                response = client.get("/health")
    assert response.status_code == 503
