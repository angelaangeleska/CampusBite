from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_client, get_db, ping_db
from app.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await get_db().users.create_index("username", unique=True)
    yield
    await close_client()


settings = get_settings()
app = FastAPI(title="CampusBite Auth Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.get("/health")
async def health() -> dict[str, str]:
    try:
        await ping_db()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ok", "service": "auth-service"}
