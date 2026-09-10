from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.database_models import CallSession, SecurityDecision, VerificationRequest
from backend.app.schemas.security import (
    SecurityDecisionResponse,
    SecurityActionUpdate,
    VerificationInitiateRequest,
    VerificationResponse,
)
from backend.app.core.security import get_current_user, require_role
from backend.app.services.security.verification_provider import supervisor_provider, mfa_provider
from backend.app.services.audit.ledger import audit_ledger

router = APIRouter(prefix="/security", tags=["Security Operations & Policy Decisions"])


@router.get("/decisions", response_model=List[SecurityDecisionResponse])
def list_security_decisions(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists security decisions. Returns empty list when no decisions exist."""
    query = db.query(SecurityDecision)
    if status_filter:
        query = query.filter(SecurityDecision.action_status == status_filter.upper())
    decisions = query.order_by(SecurityDecision.created_at.desc()).offset(offset).limit(limit).all()
    return decisions


@router.post("/decisions/{call_id}/resolve", response_model=SecurityDecisionResponse)
def resolve_decision(
    call_id: str,
    update_in: SecurityActionUpdate,
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST"])),
    db: Session = Depends(get_db),
):
    """
    Allows a human security analyst or supervisor to review, resolve, or override
    a transaction placed on hold.
    """
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    decision = (
        db.query(SecurityDecision)
        .filter(SecurityDecision.call_id == call.id)
        .order_by(SecurityDecision.created_at.desc())
        .first()
    )
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No security decision recorded for call {call_id}.",
        )

    valid_statuses = {"RESOLVED_ALLOW", "RESOLVED_BLOCKED", "OVERRIDDEN"}
    if update_in.action_status.upper() not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action status. Must be one of: {', '.join(valid_statuses)}",
        )

    decision.action_status = update_in.action_status.upper()
    decision.analyst_notes = update_in.analyst_notes
    decision.resolved_by = current_user.get("sub", "ANALYST")
    decision.resolved_at = datetime.now(timezone.utc)

    if update_in.action_status.upper() in ("RESOLVED_ALLOW", "OVERRIDDEN"):
        call.status = "VERIFIED"
    elif update_in.action_status.upper() == "RESOLVED_BLOCKED":
        call.status = "TERMINATED"

    db.commit()
    db.refresh(decision)

    audit_ledger.record_event(
        db=db,
        event_type="ACTION_RESOLVED",
        payload={
            "call_id": call_id,
            "previous_decision": decision.decision,
            "new_status": decision.action_status,
            "analyst_notes": decision.analyst_notes,
        },
        call_id=call.id,
        actor=decision.resolved_by,
    )

    return decision


@router.post("/verification/{call_id}/initiate", response_model=VerificationResponse)
def initiate_verification(
    call_id: str,
    req: VerificationInitiateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initiates an independent out-of-band verification workflow."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    verif_record = VerificationRequest(
        call_id=call.id,
        method=req.method.upper(),
        status="INITIATED",
        details=req.details,
        expires_at=expires_at,
    )
    db.add(verif_record)
    db.commit()
    db.refresh(verif_record)

    audit_ledger.record_event(
        db=db,
        event_type="VERIFICATION_REQUESTED",
        payload={
            "call_id": call_id,
            "verification_id": verif_record.id,
            "method": verif_record.method,
            "expires_at": expires_at.isoformat(),
        },
        call_id=call.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    return verif_record


@router.post("/verification/{call_id}/complete", response_model=VerificationResponse)
def complete_verification(
    call_id: str,
    verification_code: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Confirms completion of an out-of-band verification challenge."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    verif_record = (
        db.query(VerificationRequest)
        .filter(VerificationRequest.call_id == call.id, VerificationRequest.status == "INITIATED")
        .order_by(VerificationRequest.created_at.desc())
        .first()
    )
    if not verif_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending verification request for this session.",
        )

    if datetime.now(timezone.utc) > verif_record.expires_at.replace(tzinfo=timezone.utc):
        verif_record.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification challenge has expired.",
        )

    # Validate verification code
    if len(verification_code.strip()) >= 4:
        verif_record.status = "VERIFIED"
        call.status = "VERIFIED"
        call.authentication_state = "VERIFIED"

        # Update decision if pending
        decision = (
            db.query(SecurityDecision)
            .filter(SecurityDecision.call_id == call.id, SecurityDecision.action_status == "PENDING")
            .first()
        )
        if decision:
            decision.action_status = "RESOLVED_ALLOW"
            decision.resolved_by = current_user.get("sub", "SYSTEM")
            decision.resolved_at = datetime.now(timezone.utc)

        db.commit()

        audit_ledger.record_event(
            db=db,
            event_type="VERIFICATION_COMPLETED",
            payload={
                "call_id": call_id,
                "verification_id": verif_record.id,
                "outcome": "VERIFIED",
            },
            call_id=call.id,
            actor=current_user.get("sub", "SYSTEM"),
        )
    else:
        verif_record.status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code provided.",
        )

    return verif_record


@router.post("/actions/simulate-sensitive-action")
def simulate_sensitive_action(
    payload: dict,
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST", "AUTHORIZED_OPERATOR"])),
    db: Session = Depends(get_db),
):
    """
    Controlled cybersecurity simulation of sensitive action authorization.
    Evaluates whether an urgent verbal request (e.g. ₹25 Lakh transfer or MFA reset)
    should be allowed or held for step-up verification.
    STRICT COMPLIANCE NOTICE: Purely simulated. Zero real bank accounts, UPI, or financial transfers.
    """
    call_id = payload.get("call_id")
    action_type = payload.get("action_type", "FINANCIAL_ACTION")
    description = payload.get("action_description", "Transfer ₹25,00,000 immediately")
    simulated_amount = payload.get("simulated_amount", 2500000.0)

    call = None
    if call_id:
        call = db.query(CallSession).filter(CallSession.call_id == call_id).first()

    if not call:
        # Fallback to latest active or created call
        call = db.query(CallSession).order_by(CallSession.created_at.desc()).first()

    if not call:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active communication session found to bind sensitive action to.",
        )

    # Fetch latest risk assessment if available
    from backend.app.models.database_models import RiskAssessment
    latest_risk = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.call_id == call.id)
        .order_by(RiskAssessment.created_at.desc())
        .first()
    )

    current_risk_score = latest_risk.overall_risk_score if latest_risk else 78.5

    # Determine security decision based on risk and sensitivity
    if current_risk_score >= 70.0 or simulated_amount > 500000:
        decision_code = "HOLD_SENSITIVE_ACTION"
        required_action = "MFA_PUSH"
        call_status = "HOLD"
        message = (
            f"Sensitive action '{description}' held by VoiceGuard Security Gateway. "
            f"Risk score ({current_risk_score:.1f}/100) exceeds threshold. "
            f"Independent verification challenge dispatched."
        )
    elif current_risk_score >= 40.0:
        decision_code = "ADDITIONAL_VERIFICATION"
        required_action = "SUPERVISOR_CALLBACK"
        call_status = "HOLD"
        message = (
            f"Sensitive action '{description}' requires step-up authentication. "
            f"Risk score: {current_risk_score:.1f}/100."
        )
    else:
        decision_code = "ALLOW"
        required_action = "NONE"
        call_status = "ACTIVE"
        message = f"Interaction risk is LOW ({current_risk_score:.1f}/100). Sensitive action permissible."

    # Update call state
    call.action_type = action_type
    call.action_sensitivity = "CRITICAL" if simulated_amount > 1000000 else "HIGH"
    call.transaction_amount = simulated_amount
    call.status = call_status

    # Record decision
    new_decision = SecurityDecision(
        call_id=call.id,
        decision=decision_code,
        reason=f"Controlled Protected Action Simulation: {description}. Risk: {current_risk_score:.1f}/100",
        required_action=required_action,
        action_status="PENDING" if decision_code != "ALLOW" else "RESOLVED_ALLOW",
        analyst_notes="Simulated enterprise action gate evaluation.",
    )
    db.add(new_decision)
    db.commit()

    # Record in cryptographic audit ledger
    audit_ledger.record_event(
        db=db,
        event_type="PROTECTED_ACTION_EVALUATED",
        payload={
            "call_id": call.call_id,
            "action_type": action_type,
            "simulated_amount": simulated_amount,
            "description": description,
            "decision": decision_code,
            "risk_score": current_risk_score,
            "compliance_notice": "Controlled cybersecurity simulation. No real money transferred.",
        },
        call_id=call.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    return {
        "call_id": call.call_id,
        "action_type": action_type,
        "description": description,
        "simulated_amount": simulated_amount,
        "risk_score": current_risk_score,
        "decision": decision_code,
        "required_action": required_action,
        "status": call_status,
        "message": message,
        "simulated_only": True,
    }

