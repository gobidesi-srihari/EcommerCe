from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text, func

from database import Base


class OrderComplaint(Base):
    __tablename__ = "order_complaints"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="open")
    admin_response = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'in_review', 'resolved')",
            name="ck_order_complaints_status",
        ),
    )
