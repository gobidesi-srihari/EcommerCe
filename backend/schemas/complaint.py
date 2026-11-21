from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ComplaintCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=150)
    message: str = Field(min_length=10, max_length=5000)

    @field_validator("subject", "message")
    @classmethod
    def strip_nonempty_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text cannot be blank")
        return value


class ComplaintUpdate(BaseModel):
    status: Literal["open", "in_review", "resolved"]
    admin_response: str = Field(default="", max_length=5000)


class ComplaintResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    subject: str
    message: str
    status: str
    admin_response: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
