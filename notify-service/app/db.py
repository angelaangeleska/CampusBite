from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConfigurationError

from app.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(get_settings().effective_mongo_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    try:
        return get_client().get_default_database()
    except ConfigurationError as exc:
        raise RuntimeError(
            "MONGO_URI must include a database name, "
            "e.g. mongodb://127.0.0.1:27017/campusbite_notify"
        ) from exc


async def ping_db() -> None:
    await get_db().command("ping")


async def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
