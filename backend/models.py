"""SQLAlchemy models (Python 3.9 compatible)."""
from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    company: Mapped[Optional[str]] = mapped_column(String(160), nullable=True, default=None)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="New", index=True)
    follow_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    discussions: Mapped[List["Discussion"]] = relationship(
        "Discussion", back_populates="lead", cascade="all, delete-orphan", order_by="Discussion.created_at.desc()"
    )


class Discussion(Base):
    __tablename__ = "discussions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lead_id: Mapped[int] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False)
    follow_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    lead: Mapped[Lead] = relationship("Lead", back_populates="discussions")
