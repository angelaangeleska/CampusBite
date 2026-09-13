from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo import ReturnDocument

from app.db import get_db
from app.models import NotificationCreate, NotificationOut, utc_now
from app.security import optional_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _serialize(doc: dict) -> NotificationOut:
    return NotificationOut(
        id=str(doc["_id"]),
        type=doc["type"],
        order_id=doc.get("order_id"),
        customer_name=doc.get("customer_name"),
        customer_username=doc.get("customer_username"),
        message=doc["message"],
        read=bool(doc.get("read", False)),
        created_at=doc["created_at"],
    )


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    user=Depends(optional_user),
) -> list[NotificationOut]:
    query: dict = {}
    if user and user.role == "staff":
        query = {"type": {"$in": ["order.new", "order.placed"]}}
    elif user and user.role == "customer":
        query["customer_username"] = user.username
        query["type"] = "order.status_changed"
    else:
        raise HTTPException(
            status_code=401,
            detail="Log in to see notifications",
        )
    cursor = get_db().notifications.find(query).sort("created_at", -1).limit(limit)
    return [_serialize(doc) async for doc in cursor]


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def create_notification(payload: NotificationCreate) -> NotificationOut:
    doc = {
        "type": payload.type,
        "order_id": payload.order_id,
        "customer_name": payload.customer_name,
        "customer_username": payload.customer_username,
        "message": payload.message,
        "read": False,
        "created_at": utc_now(),
    }
    result = await get_db().notifications.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_read(notification_id: str) -> NotificationOut:
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification id")
    doc = await get_db().notifications.find_one_and_update(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Notification not found")
    return _serialize(doc)
