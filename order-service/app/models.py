from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class OrderStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    denied = "denied"
    preparing = "preparing"
    ready = "ready"
    picked_up = "picked_up"


ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.accepted, OrderStatus.denied},
    OrderStatus.accepted: {OrderStatus.preparing},
    OrderStatus.denied: set(),
    OrderStatus.preparing: {OrderStatus.ready},
    OrderStatus.ready: {OrderStatus.picked_up},
    OrderStatus.picked_up: set(),
}


class OrderItemIn(BaseModel):
    menu_item_id: str
    qty: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(min_length=1)
    customer_name: str = Field(min_length=1, max_length=80)
    note: Optional[str] = Field(default=None, max_length=200)

    @field_validator("customer_name")
    @classmethod
    def normalize_customer_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("A name is required")
        return cleaned

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    reason: Optional[str] = Field(default=None, max_length=200)

    @field_validator("reason")
    @classmethod
    def normalize_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class OrderItemOut(BaseModel):
    menu_item_id: str
    name: str
    price: float
    qty: int


class OrderOut(BaseModel):
    id: str
    customer_name: str
    customer_username: Optional[str] = None
    items: list[OrderItemOut]
    status: OrderStatus
    status_reason: Optional[str] = None
    note: Optional[str] = None
    total: float
    created_at: datetime
    updated_at: datetime


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


STATUS_MESSAGES = {
    OrderStatus.pending: "Waiting for the kitchen to accept or deny your order",
    OrderStatus.accepted: "Kitchen accepted your order",
    OrderStatus.denied: "Kitchen cannot prepare this order",
    OrderStatus.preparing: "Your order is being prepared",
    OrderStatus.ready: "Your order is ready for pickup",
    OrderStatus.picked_up: "Order marked as picked up — enjoy!",
}


def notification_message(
    status: OrderStatus,
    customer_name: str,
    reason: str | None = None,
) -> str:
    if status == OrderStatus.pending:
        return f"New order in from {customer_name}"
    body = STATUS_MESSAGES[status]
    if status == OrderStatus.denied and reason:
        body = f"{body}: {reason}"
    return body
