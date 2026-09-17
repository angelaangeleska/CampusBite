from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import NotificationCreate


def test_notification_requires_message() -> None:
    with pytest.raises(ValidationError):
        NotificationCreate(type="order.placed", message="")


def test_notification_create_keeps_type() -> None:
    note = NotificationCreate(type="order.status_changed", message="Ready for pickup")
    assert note.type == "order.status_changed"


def test_health_ok() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            ping.return_value = None
            with TestClient(app) as client:
                response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "notify-service"}


def test_health_when_database_is_down() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            ping.side_effect = RuntimeError("mongo down")
            with TestClient(app) as client:
                response = client.get("/health")
    assert response.status_code == 503
