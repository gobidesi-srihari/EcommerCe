from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=10000)
    category: str = Field(default="General", min_length=1, max_length=80)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    image_url: str = Field(default="", max_length=1000)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=10000)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    stock: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None, max_length=1000)
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
    price: Decimal
    stock: int
    image_url: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
