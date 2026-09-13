from typing import Literal

from pydantic import BaseModel, Field, field_validator

Role = Literal["customer", "staff"]


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=72)
    role: Role = "customer"

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not cleaned.replace("_", "").isalnum():
            raise ValueError("Username may contain letters, numbers, and underscores")
        return cleaned


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=72)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: Role


class MeOut(BaseModel):
    username: str
    role: Role
