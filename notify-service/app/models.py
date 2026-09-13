from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class NotificationCreate(BaseModel):
    type: str = Field(min_length=1, max_length=80)
    order_id: Optional[str] = None
    customer_name: Optional[str] = Field(default=None, max_length=80)
    customer_username: Optional[str] = Field(default=None, max_length=32)
    message: str = Field(min_length=1, max_length=500)


class NotificationOut(BaseModel):
    id: str
    type: str
    order_id: Optional[str]
    customer_name: Optional[str] = None
    customer_username: Optional[str] = None
    message: str
    read: bool
    created_at: datetime


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
