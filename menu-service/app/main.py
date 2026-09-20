from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_client, get_db, ping_db
from app.models import SEED_ITEMS, utc_now
from app.routers.menu import router as menu_router


async def seed_if_empty() -> None:
    collection = get_db().menu_items
    if await collection.count_documents({}) > 0:
        return
    docs = []
    for item in SEED_ITEMS:
        doc = item.model_dump()
        doc["created_at"] = utc_now()
        docs.append(doc)
    await collection.insert_many(docs)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await seed_if_empty()
    yield
    await close_client()


settings = get_settings()
app = FastAPI(title="CampusBite Menu Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://[a-z0-9.-]+\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(menu_router)


@app.get("/health")
async def health() -> dict[str, str]:
    try:
        await ping_db()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ok", "service": "menu-service"}
