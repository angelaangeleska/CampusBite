from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPError
from pymongo import ReturnDocument

from app.clients import fetch_menu_item, publish_notification
from app.db import get_db
from app.models import (
    ALLOWED_TRANSITIONS,
    OrderCreate,
    OrderOut,
    OrderStatus,
    OrderStatusUpdate,
    utc_now,
)
from app.security import optional_user, require_staff

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _status(value: str) -> OrderStatus:
    if value == "placed":
        return OrderStatus.pending
    return OrderStatus(value)


def _serialize(doc: dict) -> OrderOut:
    return OrderOut(
        id=str(doc["_id"]),
        customer_name=doc["customer_name"],
        customer_username=doc.get("customer_username"),
        items=doc["items"],
        status=_status(doc["status"]),
        status_reason=doc.get("status_reason"),
        note=doc.get("note"),
        total=float(doc["total"]),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(user=Depends(optional_user)) -> list[OrderOut]:
    query: dict = {}
    if user and user.role == "staff":
        query = {}
    elif user and user.role == "customer":
        query["customer_username"] = user.username
    else:
        raise HTTPException(
            status_code=401,
            detail="Log in to see orders",
        )
    cursor = get_db().orders.find(query).sort("created_at", -1)
    return [_serialize(doc) async for doc in cursor]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str) -> OrderOut:
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order id")
    doc = await get_db().orders.find_one({"_id": ObjectId(order_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize(doc)


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    user=Depends(optional_user),
) -> OrderOut:
    if user and user.role == "staff":
        raise HTTPException(
            status_code=403,
            detail="Kitchen staff cannot place guest orders",
        )
    customer_username = user.username if user and user.role == "customer" else None
    customer_name = customer_username or payload.customer_name
    line_items = []
    total = 0.0

    for line in payload.items:
        try:
            menu_item = await fetch_menu_item(line.menu_item_id)
        except HTTPError as exc:
            raise HTTPException(
                status_code=503,
                detail="menu-service unreachable",
            ) from exc

        if menu_item is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown menu item: {line.menu_item_id}",
            )
        if not menu_item.get("available", True):
            raise HTTPException(
                status_code=400,
                detail=f"Menu item not available: {menu_item.get('name')}",
            )

        price = float(menu_item["price"])
        line_items.append(
            {
                "menu_item_id": line.menu_item_id,
                "name": menu_item["name"],
                "price": price,
                "qty": line.qty,
            }
        )
        total += price * line.qty

    now = utc_now()
    doc = {
        "customer_name": customer_name,
        "customer_username": customer_username,
        "items": line_items,
        "status": OrderStatus.pending.value,
        "status_reason": None,
        "note": payload.note,
        "total": round(total, 2),
        "created_at": now,
        "updated_at": now,
    }
    result = await get_db().orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    order = _serialize(doc)

    await publish_notification(
        order_id=order.id,
        status=OrderStatus.pending,
        customer_name=order.customer_name,
        customer_username=customer_username,
    )
    return order


@router.patch("/{order_id}", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    _staff=Depends(require_staff),
) -> OrderOut:
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=400, detail="Invalid order id")

    existing = await get_db().orders.find_one({"_id": ObjectId(order_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")

    current = _status(existing["status"])
    if payload.status == current:
        return _serialize(existing)

    allowed = ALLOWED_TRANSITIONS[current]
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from {current.value} to {payload.status.value}",
        )

    updates = {
        "status": payload.status.value,
        "updated_at": utc_now(),
        "status_reason": payload.reason if payload.status == OrderStatus.denied else None,
    }
    updated = await get_db().orders.find_one_and_update(
        {"_id": ObjectId(order_id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")
    order = _serialize(updated)
    await publish_notification(
        order_id=order.id,
        status=payload.status,
        customer_name=order.customer_name,
        customer_username=order.customer_username,
        reason=order.status_reason,
    )
    return order
