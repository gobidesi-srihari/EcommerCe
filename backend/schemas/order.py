from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from schemas.complaint import ComplaintResponse


class OrderCreate(BaseModel):
    delivery_name: str = Field(min_length=1, max_length=150)
    delivery_phone: str = Field(
        min_length=8,
        max_length=24,
        pattern=r"^\+?[0-9][0-9\s()-]{6,22}$",
    )
    delivery_address: str = Field(min_length=5, max_length=1000)
    delivery_city: str = Field(min_length=1, max_length=100)
    delivery_postal_code: str = Field(
        min_length=4,
        max_length=12,
        pattern=r"^[A-Za-z0-9 -]+$",
    )


class OrderStatusUpdate(BaseModel):
    status: Literal[
        "confirmed",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
    ]


class OrderAssignmentUpdate(BaseModel):
    delivery_agent_id: int | None


class OrderItemResponse(BaseModel):
    id: int
    product_id: int | None
    product_name: str
    unit_price: float
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class OrderHistoryResponse(BaseModel):
    id: int
    status: str
    event_type: str
    note: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    customer_name: str
    delivery_agent_id: int | None
    delivery_agent_name: str | None
    delivery_name: str
    delivery_phone: str
    delivery_address: str
    delivery_city: str
    delivery_postal_code: str
    status: str
    payment_method: str
    payment_status: str
    total_amount: float
    created_at: datetime
    items: list[OrderItemResponse]
    history: list[OrderHistoryResponse]
    complaints: list[ComplaintResponse]

    model_config = ConfigDict(from_attributes=True)


class DeliveryAgentResponse(BaseModel):
    id: int
    full_name: str

    model_config = ConfigDict(from_attributes=True)
