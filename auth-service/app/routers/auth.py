from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.errors import DuplicateKeyError
import jwt

from app.config import get_settings
from app.db import get_db
from app.models import LoginIn, MeOut, RegisterIn, TokenOut
from app.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _find_user(username: str) -> dict | None:
    db = get_db()
    return await db.users.find_one({"username": username}) or await db.staff_users.find_one(
        {"username": username}
    )


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterIn) -> TokenOut:
    if await _find_user(payload.username):
        raise HTTPException(status_code=409, detail="Username already taken")
    doc = {
        "username": payload.username,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "created_at": _now(),
    }
    try:
        await get_db().users.insert_one(doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="Username already taken") from exc
    return TokenOut(
        access_token=create_token(payload.username, payload.role),
        username=payload.username,
        role=payload.role,
    )


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn) -> TokenOut:
    user = await _find_user(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    role = user.get("role") or "staff"
    if role not in {"customer", "staff"}:
        role = "staff"
    return TokenOut(
        access_token=create_token(payload.username, role),
        username=payload.username,
        role=role,
    )


@router.get("/me", response_model=MeOut)
async def me(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> MeOut:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            creds.credentials,
            get_settings().jwt_secret,
            algorithms=["HS256"],
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    username = payload.get("sub")
    role = payload.get("role")
    if not username or role not in {"customer", "staff"}:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await _find_user(username)
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return MeOut(username=username, role=role)
