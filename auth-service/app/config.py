from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongo_uri: str = "mongodb://127.0.0.1:27017/campusbite_auth"
    port: int = 8004
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    jwt_secret: str = "your-jwt-secret"
    jwt_expire_hours: int = 12
    auth_mongo_uri: str | None = None
    auth_port: int | None = None

    @property
    def effective_mongo_uri(self) -> str:
        return self.auth_mongo_uri or self.mongo_uri

    @property
    def effective_port(self) -> int:
        return self.auth_port or self.port

    @property
    def cors_origin_list(self) -> list[str]:
        origins: list[str] = []
        for raw in self.cors_origins.split(","):
            origin = raw.strip()
            if not origin:
                continue
            if origin != "*" and "://" not in origin:
                origin = f"https://{origin}"
            origins.append(origin)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
