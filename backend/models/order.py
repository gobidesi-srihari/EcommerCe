from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    delivery_agent_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    delivery_name = Column(String(150), nullable=False)
    delivery_phone = Column(String(24), nullable=False)
    delivery_address = Column(Text, nullable=False)
    delivery_city = Column(String(100), nullable=False)
    delivery_postal_code = Column(String(12), nullable=False)
    status = Column(String(30), nullable=False, default="placed", index=True)
    payment_method = Column(String(30), nullable=False, default="cash_on_delivery")
    payment_status = Column(String(30), nullable=False, default="pending")
    total_amount = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    customer = relationship("User", foreign_keys=[customer_id])
    delivery_agent = relationship("User", foreign_keys=[delivery_agent_id])
    items = relationship("OrderItem", cascade="all, delete-orphan", order_by="OrderItem.id")
    history = relationship(
        "OrderStatusHistory",
        cascade="all, delete-orphan",
        order_by="OrderStatusHistory.created_at",
    )
    complaints = relationship(
        "OrderComplaint",
        cascade="all, delete-orphan",
        order_by="OrderComplaint.created_at",
    )

    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="ck_orders_total_nonnegative"),
        CheckConstraint(
            "status IN ('placed', 'confirmed', 'packed', 'shipped', "
            "'out_for_delivery', 'delivered', 'cancelled')",
            name="ck_orders_status",
        ),
        CheckConstraint(
            "payment_method = 'cash_on_delivery'",
            name="ck_orders_payment_method",
        ),
        CheckConstraint(
            "payment_status IN ('pending', 'collected', 'cancelled')",
            name="ck_orders_payment_status",
        ),
    )

    @property
    def order_number(self):
        return f"ORD-{self.id:06d}" if self.id is not None else "ORD-PENDING"

    @property
    def delivery_agent_name(self):
        return self.delivery_agent.full_name if self.delivery_agent else None

    @property
    def customer_name(self):
        return self.customer.full_name


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(150), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    product = relationship("Product")

    __table_args__ = (
        CheckConstraint("unit_price > 0", name="ck_order_items_price_positive"),
        CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
    )


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False)
    event_type = Column(String(30), nullable=False, default="status")
    note = Column(String(500), nullable=False, default="")
    changed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
