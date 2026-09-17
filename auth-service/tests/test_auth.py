from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import get_settings
from app.main import app
from app.models import RegisterIn
from app.security import create_token, hash_password, verify_password


def test_register_normalizes_username() -> None:
    payload = RegisterIn(username="  Ana_12 ", password="secret1", role="customer")
    assert payload.username == "ana_12"


def test_register_rejects_short_password() -> None:
    with pytest.raises(ValidationError):
        RegisterIn(username="ana", password="123", role="customer")


def test_register_rejects_bad_username() -> None:
    with pytest.raises(ValidationError):
        RegisterIn(username="ana!", password="secret1", role="customer")


def test_password_hash_roundtrip() -> None:
    hashed = hash_password("secret1")
    assert hashed != "secret1"
    assert verify_password("secret1", hashed)
    assert not verify_password("wrong", hashed)


def test_create_token_contains_subject_and_role() -> None:
    token = create_token("ana", "staff")
    payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == "ana"
    assert payload["role"] == "staff"


def test_health_ok() -> None:
    with (
        patch("app.main.ping_db", new_callable=AsyncMock) as ping,
        patch("app.main.close_client", new_callable=AsyncMock),
        patch("app.main.get_db") as get_db,
    ):
        ping.return_value = None
        get_db.return_value.users.create_index = AsyncMock()
        with TestClient(app) as client:
            response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "auth-service"}


def test_health_when_database_is_down() -> None:
    with (
        patch("app.main.ping_db", new_callable=AsyncMock) as ping,
        patch("app.main.close_client", new_callable=AsyncMock),
        patch("app.main.get_db") as get_db,
    ):
        ping.side_effect = RuntimeError("mongo down")
        get_db.return_value.users.create_index = AsyncMock()
        with TestClient(app) as client:
            response = client.get("/health")
    assert response.status_code == 503
