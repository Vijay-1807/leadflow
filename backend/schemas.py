"""Pydantic schemas (Python 3.9 compatible)."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

VALID_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"]


class DiscussionCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)
    follow_up_at: Optional[datetime] = None


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    follow_up_at: Optional[datetime]
    created_at: datetime


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    company: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=40)


class LeadUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    company: Optional[str] = Field(default=None, max_length=160)
    phone: Optional[str] = Field(default=None, max_length=40)
    status: Optional[str] = None
    follow_up_at: Optional[datetime] = None


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    company: Optional[str]
    phone: Optional[str]
    status: str
    follow_up_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    last_note: Optional[str] = None
    last_discussion_at: Optional[datetime] = None
    discussions_count: int = 0


class LeadDetailOut(LeadOut):
    discussions: List[DiscussionOut] = []
