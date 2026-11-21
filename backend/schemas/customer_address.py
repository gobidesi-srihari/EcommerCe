from pydantic import BaseModel, ConfigDict

from schemas.order import OrderCreate


class CustomerAddressResponse(OrderCreate):
    model_config = ConfigDict(from_attributes=True)
