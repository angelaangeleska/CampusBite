from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import ReturnDocument

from app.db import get_db
from app.models import MenuItemCreate, MenuItemOut, MenuItemUpdate, utc_now
from app.security import optional_user, require_staff

router = APIRouter(prefix="/api/menu", tags=["menu"])


def _serialize(doc: dict) -> MenuItemOut:
    return MenuItemOut(
        id=str(doc["_id"]),
        name=doc["name"],
        description=doc.get("description", ""),
        price=float(doc["price"]),
        category=doc["category"],
        available=bool(doc.get("available", True)),
        created_at=doc["created_at"],
    )


@router.get("/items", response_model=list[MenuItemOut])
async def list_items(
    available_only: bool = False,
    user=Depends(optional_user),
) -> list[MenuItemOut]:
    staff = user is not None and user.role == "staff"
    query: dict = {} if staff and not available_only else {"available": True}
    cursor = get_db().menu_items.find(query).sort([("category", 1), ("name", 1)])
    return [_serialize(doc) async for doc in cursor]


@router.get("/items/{item_id}", response_model=MenuItemOut)
async def get_item(item_id: str) -> MenuItemOut:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    doc = await get_db().menu_items.find_one({"_id": ObjectId(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return _serialize(doc)


@router.post("/items", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: MenuItemCreate,
    _staff=Depends(require_staff),
) -> MenuItemOut:
    doc = payload.model_dump()
    doc["created_at"] = utc_now()
    result = await get_db().menu_items.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.patch("/items/{item_id}", response_model=MenuItemOut)
async def update_item(
    item_id: str,
    payload: MenuItemUpdate,
    _staff=Depends(require_staff),
) -> MenuItemOut:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await get_db().menu_items.find_one_and_update(
        {"_id": ObjectId(item_id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return _serialize(result)


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str, _staff=Depends(require_staff)) -> None:
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid item id")
    result = await get_db().menu_items.delete_one({"_id": ObjectId(item_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
