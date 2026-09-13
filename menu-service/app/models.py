from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=60)
    available: bool = True

    @field_validator("name", "category")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty")
        return cleaned

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        return value.strip()


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    price: Optional[float] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=60)
    available: Optional[bool] = None

    @field_validator("name", "category")
    @classmethod
    def strip_required(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field cannot be empty")
        return cleaned

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()


class MenuItemOut(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    available: bool
    created_at: datetime


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


SEED_ITEMS: list[MenuItemCreate] = [
    MenuItemCreate(
        name="Club sandwich",
        description="Chicken, bacon, lettuce, tomato",
        price=220.0,
        category="Sandwiches",
    ),
    MenuItemCreate(
        name="Vegetable soup",
        description="Seasonal vegetables with bread",
        price=140.0,
        category="Soups",
    ),
    MenuItemCreate(
        name="Caesar salad",
        description="Romaine, parmesan, croutons",
        price=180.0,
        category="Salads",
    ),
    MenuItemCreate(
        name="Margherita pizza slice",
        description="Tomato, mozzarella, basil",
        price=160.0,
        category="Pizza",
    ),
    MenuItemCreate(
        name="Espresso",
        description="Short coffee",
        price=70.0,
        category="Drinks",
    ),
    MenuItemCreate(
        name="Orange juice",
        description="Freshly squeezed",
        price=90.0,
        category="Drinks",
    ),
    MenuItemCreate(
        name="Chocolate muffin",
        description="Baked daily",
        price=80.0,
        category="Desserts",
    ),
    MenuItemCreate(
        name="Pasta pesto",
        description="Penne with basil pesto",
        price=210.0,
        category="Mains",
    ),
]
