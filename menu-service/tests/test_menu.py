from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.models import MenuItemCreate


def test_menu_item_strips_name() -> None:
    item = MenuItemCreate(name="  Soup  ", price=140, category="Soups")
    assert item.name == "Soup"


def test_menu_item_rejects_zero_price() -> None:
    with pytest.raises(ValidationError):
        MenuItemCreate(name="Soup", price=0, category="Soups")


def test_health_ok() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            with patch("app.main.seed_if_empty", new_callable=AsyncMock):
                ping.return_value = None
                with TestClient(app) as client:
                    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "menu-service"}


def test_health_when_database_is_down() -> None:
    with patch("app.main.ping_db", new_callable=AsyncMock) as ping:
        with patch("app.main.close_client", new_callable=AsyncMock):
            with patch("app.main.seed_if_empty", new_callable=AsyncMock):
                ping.side_effect = RuntimeError("mongo down")
                with TestClient(app) as client:
                    response = client.get("/health")
    assert response.status_code == 503
