from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from database import get_db
from dependencies import get_current_user, require_admin
from models.cart_item import CartItem
from models.order import Order, OrderItem, OrderStatusHistory
from models.order_complaint import OrderComplaint
from models.product import Product
from models.user import User
from routers.customers import save_customer_address
from schemas.order import (
    DeliveryAgentResponse,
    OrderAssignmentUpdate,
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
)
from schemas.complaint import ComplaintCreate, ComplaintResponse, ComplaintUpdate


router = APIRouter(prefix="/orders", tags=["Orders"])

ADMIN_TRANSITIONS = {
    "placed": {"confirmed", "cancelled"},
    "confirmed": {"packed", "cancelled"},
    "packed": {"shipped", "cancelled"},
    "shipped": set(),
    "out_for_delivery": set(),
    "delivered": set(),
    "cancelled": set(),
}


def _order_query(db: Session):
    return db.query(Order).options(
        selectinload(Order.items),
        selectinload(Order.history),
        joinedload(Order.delivery_agent),
        joinedload(Order.customer),
        selectinload(Order.complaints),
    )


def _lock_order_query(db: Session):
    return db.query(Order).options(
        selectinload(Order.items),
        selectinload(Order.history),
    )


def _ensure_customer(user: User):
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")


def _order_response(order: Order, user: User):
    response = OrderResponse.model_validate(order)
    if user.role == "delivery_agent":
        response.complaints = []
    return response


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ensure_customer(current_user)

    cart_items = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id)
        .order_by(CartItem.product_id)
        .with_for_update()
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty")

    order_items = []
    total = Decimal("0.00")
    try:
        for cart_item in cart_items:
            product = (
                db.query(Product)
                .filter(Product.id == cart_item.product_id)
                .with_for_update()
                .first()
            )
            if product is None or not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A product in your cart is no longer available. Remove it before placing the order.",
                )
            if cart_item.quantity > product.stock:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Only {product.stock} units of {product.name} are currently available.",
                )

            price = Decimal(product.price)
            total += price * cart_item.quantity
            order_items.append(
                {
                    "product": product,
                    "product_id": product.id,
                    "product_name": product.name,
                    "unit_price": price,
                    "quantity": cart_item.quantity,
                }
            )

        save_customer_address(db, current_user.id, data)

        order = Order(
            customer_id=current_user.id,
            delivery_name=data.delivery_name,
            delivery_phone=data.delivery_phone,
            delivery_address=data.delivery_address,
            delivery_city=data.delivery_city,
            delivery_postal_code=data.delivery_postal_code,
            status="placed",
            payment_method="cash_on_delivery",
            payment_status="pending",
            total_amount=total,
        )
        db.add(order)
        db.flush()

        for item in order_items:
            item["product"].stock -= item["quantity"]
            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=item["product_id"],
                    product_name=item["product_name"],
                    unit_price=item["unit_price"],
                    quantity=item["quantity"],
                )
            )
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                status="placed",
                event_type="status",
                note="Order placed. Payment is due in cash on delivery.",
                changed_by_id=current_user.id,
            )
        )
        for cart_item in cart_items:
            db.delete(cart_item)
        db.commit()
    except Exception:
        db.rollback()
        raise

    order = _order_query(db).filter(Order.id == order.id).one()
    return _order_response(order, current_user)


@router.get("/delivery-agents", response_model=list[DeliveryAgentResponse])
def list_delivery_agents(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return (
        db.query(User)
        .filter(User.role == "delivery_agent", User.is_active.is_(True))
        .order_by(User.full_name, User.id)
        .all()
    )


@router.get("/", response_model=list[OrderResponse])
def list_orders(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _order_query(db)
    if current_user.role == "customer":
        query = query.filter(Order.customer_id == current_user.id)
    elif current_user.role == "delivery_agent":
        query = query.filter(Order.delivery_agent_id == current_user.id)
    elif current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order access required")

    if status_filter:
        query = query.filter(Order.status == status_filter)
    orders = query.order_by(Order.created_at.desc(), Order.id.desc()).all()
    return [_order_response(order, current_user) for order in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = _order_query(db).filter(Order.id == order_id).first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role == "delivery_agent" and order.delivery_agent_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role not in ("admin", "customer", "delivery_agent"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Order access required")
    return _order_response(order, current_user)


@router.post(
    "/{order_id}/complaints",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_order_complaint(
    order_id: int,
    data: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer access required")
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None or order.customer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    complaint = OrderComplaint(
        order_id=order.id,
        customer_id=current_user.id,
        subject=data.subject.strip(),
        message=data.message.strip(),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.patch(
    "/{order_id}/complaints/{complaint_id}",
    response_model=ComplaintResponse,
)
def update_order_complaint(
    order_id: int,
    complaint_id: int,
    data: ComplaintUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    complaint = db.query(OrderComplaint).filter(
        OrderComplaint.id == complaint_id,
        OrderComplaint.order_id == order_id,
    ).first()
    if complaint is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found")
    response = data.admin_response.strip()
    if data.status == "resolved" and not response:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add a response before resolving a complaint",
        )

    complaint.status = data.status
    complaint.admin_response = response
    db.commit()
    db.refresh(complaint)
    return complaint


@router.patch("/{order_id}/assignment", response_model=OrderResponse)
def assign_delivery_agent(
    order_id: int,
    data: OrderAssignmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    order = _lock_order_query(db).filter(Order.id == order_id).with_for_update().first()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status in ("out_for_delivery", "delivered", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An order cannot be reassigned after delivery has started",
        )

    agent = None
    if data.delivery_agent_id is not None:
        agent = db.get(User, data.delivery_agent_id)
        if agent is None or not agent.is_active or agent.role != "delivery_agent":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Select an active delivery agent")

    order.delivery_agent_id = agent.id if agent else None
    note = f"Assigned to {agent.full_name}." if agent else "Delivery agent assignment removed."
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=order.status,
            event_type="assignment",
            note=note,
            changed_by_id=admin.id,
        )
    )
    db.commit()
    order = _order_query(db).filter(Order.id == order.id).one()
    return _order_response(order, admin)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = (
        _lock_order_query(db)
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if current_user.role == "delivery_agent":
        if order.delivery_agent_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        allowed = {
            "shipped": {"out_for_delivery"},
            "out_for_delivery": {"delivered"},
        }.get(order.status, set())
    elif current_user.role == "admin":
        allowed = ADMIN_TRANSITIONS.get(order.status, set())
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only staff can update order status")

    if data.status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Order cannot move from {order.status.replace('_', ' ')} to {data.status.replace('_', ' ')}.",
        )
    if data.status == "out_for_delivery" and not order.delivery_agent_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assign a delivery agent before dispatch")

    if data.status == "cancelled":
        for item in sorted(order.items, key=lambda entry: entry.product_id or 0):
            if item.product_id is not None:
                product = (
                    db.query(Product)
                    .filter(Product.id == item.product_id)
                    .with_for_update()
                    .populate_existing()
                    .first()
                )
                if product is not None:
                    product.stock += item.quantity
        order.payment_status = "cancelled"
        note = "Order cancelled; reserved stock returned to inventory."
    elif data.status == "delivered":
        order.payment_status = "collected"
        note = "Delivered and cash collected."
    else:
        note = f"Order {data.status.replace('_', ' ')}."

    order.status = data.status
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=order.status,
            event_type="status",
            note=note,
            changed_by_id=current_user.id,
        )
    )
    db.commit()
    order = _order_query(db).filter(Order.id == order.id).one()
    return _order_response(order, current_user)
