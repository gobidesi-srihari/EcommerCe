from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_user
from models.cart_item import CartItem
from models.product import Product
from models.user import User
from schemas.cart import CartItemCreate, CartItemResponse, CartItemUpdate


router = APIRouter(prefix="/cart", tags=["Cart"])


def _require_customer(user: User):
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")


def _get_cart(db: Session, user_id: int):
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.product))
        .filter(CartItem.user_id == user_id)
        .order_by(CartItem.id)
        .all()
    )


@router.get("/", response_model=list[CartItemResponse])
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_customer(current_user)
    return [
        {"id": item.id, "quantity": item.quantity, "product": item.product}
        for item in _get_cart(db, current_user.id)
        if item.product
    ]


@router.post("/items", response_model=list[CartItemResponse], status_code=status.HTTP_200_OK)
def add_to_cart(
    data: CartItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_customer(current_user)
    product = db.get(Product, data.product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    item = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.product_id == product.id)
        .first()
    )
    new_quantity = data.quantity + (item.quantity if item else 0)
    if new_quantity > product.stock:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested quantity exceeds available stock")
    if item:
        item.quantity = new_quantity
    else:
        db.add(CartItem(user_id=current_user.id, product_id=product.id, quantity=new_quantity))
    db.commit()
    return [
        {"id": cart_item.id, "quantity": cart_item.quantity, "product": cart_item.product}
        for cart_item in _get_cart(db, current_user.id)
        if cart_item.product
    ]


@router.patch("/items/{item_id}", response_model=list[CartItemResponse])
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_customer(current_user)
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    if not item.product.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This product is no longer available")
    if data.quantity > item.product.stock:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Requested quantity exceeds available stock")
    item.quantity = data.quantity
    db.commit()
    return [
        {"id": cart_item.id, "quantity": cart_item.quantity, "product": cart_item.product}
        for cart_item in _get_cart(db, current_user.id)
        if cart_item.product
    ]


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_customer(current_user)
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(item)
    db.commit()
