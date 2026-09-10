import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.database_models import AuditEvent, CallSession
from backend.app.schemas.audit import AuditEventResponse, AuditChainVerificationResponse
from backend.app.core.security import get_current_user
from backend.app.services.audit.ledger import audit_ledger

router = APIRouter(prefix="/audit", tags=["Cryptographic Audit Ledger"])


@router.get("", response_model=List[AuditEventResponse])
def list_audit_events(
    limit: int = 50,
    offset: int = 0,
    event_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the append-only cryptographic event ledger.
    Strictly follows zero-mock policy: returns an empty list when no events exist.
    """
    query = db.query(AuditEvent)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type.upper())
    events = query.order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit).all()

    res = []
    for evt in events:
        res.append(AuditEventResponse(
            id=evt.id,
            event_id=evt.event_id,
            call_id=evt.call_id,
            event_type=evt.event_type,
            payload=json.loads(evt.payload_json),
            payload_hash=evt.payload_hash,
            previous_event_hash=evt.previous_event_hash,
            event_hash=evt.event_hash,
            actor=evt.actor,
            timestamp=evt.created_at,
        ))
    return res


@router.get("/call/{call_id}", response_model=List[AuditEventResponse])
def get_call_audit_trail(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves the full chronological forensic audit trail for a specific call."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.call_id == call.id)
        .order_by(AuditEvent.created_at.asc())
        .all()
    )

    res = []
    for evt in events:
        res.append(AuditEventResponse(
            id=evt.id,
            event_id=evt.event_id,
            call_id=evt.call_id,
            event_type=evt.event_type,
            payload=json.loads(evt.payload_json),
            payload_hash=evt.payload_hash,
            previous_event_hash=evt.previous_event_hash,
            event_hash=evt.event_hash,
            actor=evt.actor,
            timestamp=evt.created_at,
        ))
    return res


@router.get("/verify-chain", response_model=AuditChainVerificationResponse)
def verify_ledger_chain(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cryptographically traverses all audit blocks and verifies SHA-256 hash continuity.
    Detects any database tampering or unauthorized record modifications.
    """
    verification_report = audit_ledger.verify_integrity(db)
    return AuditChainVerificationResponse(**verification_report)
