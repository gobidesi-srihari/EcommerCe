from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.customer_address import CustomerAddress
from models.user import User
from schemas.customer_address import CustomerAddressResponse
from schemas.order import OrderCreate


router = APIRouter(prefix="/customers/me", tags=["Customer Profile"])


def _require_customer(user: User):
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")


@router.get("/address", response_model=CustomerAddressResponse | None)
def get_saved_address(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_customer(current_user)
    return db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == current_user.id
    ).first()


def save_customer_address(db: Session, customer_id: int, data: OrderCreate):
    address = db.query(CustomerAddress).filter(
        CustomerAddress.customer_id == customer_id
    ).with_for_update().first()
    if address is None:
        address = CustomerAddress(customer_id=customer_id, **data.model_dump())
        db.add(address)
    else:
        for field, value in data.model_dump().items():
            setattr(address, field, value)
    return address
