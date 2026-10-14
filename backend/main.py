"""LeadFlow API — FastAPI backend for PravarAI assessment (Python 3.9 compatible)."""
import os
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LeadFlow API", version="1.0.0", description="Lightweight CRM for PravarAI assessment")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allow_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", f"{frontend_url},http://localhost:3000,http://127.0.0.1:3000").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_lead_out(lead: models.Lead) -> schemas.LeadOut:
    discussions = sorted(lead.discussions, key=lambda d: d.created_at, reverse=True) if lead.discussions else []
    last = discussions[0] if discussions else None
    return schemas.LeadOut(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=lead.status,
        follow_up_at=lead.follow_up_at,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        last_note=last.note if last else None,
        last_discussion_at=last.created_at if last else None,
        discussions_count=len(discussions),
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "leadflow-api", "time": datetime.utcnow().isoformat()}


@app.get("/api/leads", response_model=List[schemas.LeadOut])
def list_leads(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(models.Lead)
    if status_filter and status_filter != "All":
        if status_filter not in schemas.VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {schemas.VALID_STATUSES}")
        q = q.filter(models.Lead.status == status_filter)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(models.Lead.name.ilike(like), models.Lead.company.ilike(like)))
    leads = q.order_by(models.Lead.updated_at.desc()).all()
    return [to_lead_out(lead) for lead in leads]


@app.post("/api/leads", response_model=schemas.LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: schemas.LeadCreate, db: Session = Depends(get_db)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    lead = models.Lead(
        name=name,
        company=payload.company.strip() if payload.company else None,
        phone=payload.phone.strip() if payload.phone else None,
        status="New",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    # System discussion so timeline is never empty
    db.add(models.Discussion(lead_id=lead.id, note="Lead created."))
    db.commit()
    db.refresh(lead)
    return to_lead_out(lead)


@app.get("/api/leads/{lead_id}", response_model=schemas.LeadDetailOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    out = to_lead_out(lead)
    discussions = (
        db.query(models.Discussion)
        .filter(models.Discussion.lead_id == lead_id)
        .order_by(models.Discussion.created_at.desc())
        .all()
    )
    dump = out.model_dump() if hasattr(out, "model_dump") else out.dict()
    val = getattr(schemas.DiscussionOut, "model_validate", schemas.DiscussionOut.from_orm)
    return schemas.LeadDetailOut(
        **dump,
        discussions=[val(d) for d in discussions],
    )


@app.patch("/api/leads/{lead_id}", response_model=schemas.LeadOut)
def update_lead(lead_id: int, payload: schemas.LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if payload.status is not None:
        if payload.status not in schemas.VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {schemas.VALID_STATUSES}")
        lead.status = payload.status
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        lead.name = payload.name.strip()
    if payload.company is not None:
        lead.company = payload.company.strip() or None
    if payload.phone is not None:
        lead.phone = payload.phone.strip() or None
    if payload.follow_up_at is not None:
        lead.follow_up_at = payload.follow_up_at
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return to_lead_out(lead)


@app.post(
    "/api/leads/{lead_id}/discussions",
    response_model=schemas.DiscussionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_discussion(lead_id: int, payload: schemas.DiscussionCreate, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    note = payload.note.strip()
    if not note:
        raise HTTPException(status_code=422, detail="Discussion note cannot be empty")
    disc = models.Discussion(lead_id=lead_id, note=note, follow_up_at=payload.follow_up_at)
    db.add(disc)
    # Saving a discussion with a follow-up updates the lead's follow-up field
    if payload.follow_up_at:
        lead.follow_up_at = payload.follow_up_at
    lead.updated_at = datetime.utcnow()
    db.commit()
    val = getattr(schemas.DiscussionOut, "model_validate", schemas.DiscussionOut.from_orm)
    return val(disc)


@app.delete("/api/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return None


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Lead.id)).scalar() or 0
    rows = db.query(models.Lead.status, func.count(models.Lead.id)).group_by(models.Lead.status).all()
    by_status = {s: c for s, c in rows}
    for s in schemas.VALID_STATUSES:
        by_status.setdefault(s, 0)
    return {"total": total, "by_status": by_status}
