from database import engine, Base
from sqlalchemy import update
from sqlalchemy.orm import Session

# Import models so SQLAlchemy registers their tables before create_all.
from models.user import User
from models.product import Product
from models.cart_item import CartItem
from models.order import Order, OrderItem, OrderStatusHistory
from models.customer_address import CustomerAddress
from models.order_complaint import OrderComplaint

# Create the tables after the configured PostgreSQL database exists.
Base.metadata.create_all(bind=engine)

with Session(engine) as db:
    db.execute(
        update(User)
        .where(User.role.notin_(("admin", "customer", "delivery_agent")))
        .values(role="customer")
    )
    customer_ids = db.query(Order.customer_id).distinct().all()
    for (customer_id,) in customer_ids:
        has_saved_address = (
            db.query(CustomerAddress.id)
            .filter(CustomerAddress.customer_id == customer_id)
            .first()
        )
        if has_saved_address:
            continue
        latest_order = (
            db.query(Order)
            .filter(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc(), Order.id.desc())
            .first()
        )
        if latest_order:
            db.add(
                CustomerAddress(
                    customer_id=customer_id,
                    delivery_name=latest_order.delivery_name,
                    delivery_phone=latest_order.delivery_phone,
                    delivery_address=latest_order.delivery_address,
                    delivery_city=latest_order.delivery_city,
                    delivery_postal_code=latest_order.delivery_postal_code,
                )
            )
    db.commit()

print("Ecommerce database tables created successfully!")