import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.db.database import get_db
from backend.app.models.database_models import (
    CallSession,
    Speaker,
    AudioAnalysis,
    RiskAssessment,
    SecurityDecision,
)
from backend.app.core.security import get_current_user

router = APIRouter(prefix="/caller-intelligence", tags=["Caller Intelligence"])


def _build_intelligence_dossier(
    db: Session,
    speaker: Optional[Speaker] = None,
    call: Optional[CallSession] = None,
    lookup_query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Constructs a Truecaller-inspired, enterprise-cybersecurity caller intelligence dossier.
    Combines identity verification, voice authenticity, speaker match, risk history,
    and recommended operational response.
    """
    # 1. Identity attributes
    if speaker:
        caller_name = speaker.display_name
        organization = speaker.organization or "Enterprise Org"
        department = speaker.department or "General"
        role_title = speaker.role_title or "Authorized Personnel"
        caller_id = speaker.caller_id or (call.caller_id if call else lookup_query or "Unknown")
        speaker_id = speaker.speaker_id
        identity_status = speaker.identity_status or "VERIFIED"
        org_trust_status = "TRUSTED_INTERNAL" if organization != "Unlisted" else "EXTERNAL_UNVERIFIED"
        mfa_enabled = speaker.mfa_enabled
        has_voice_enrollment = len(speaker.embeddings) > 0
    elif call:
        caller_name = call.claimed_identity or "Unknown External Caller"
        organization = "Unlisted External Organization"
        department = "External"
        role_title = "External Party"
        caller_id = call.caller_id or lookup_query or "Unknown"
        speaker_id = call.claimed_identity or "UNKNOWN"
        identity_status = "UNVERIFIED"
        org_trust_status = "EXTERNAL_UNVERIFIED"
        mfa_enabled = False
        has_voice_enrollment = False
    else:
        caller_name = lookup_query or "Unknown Caller"
        organization = "Unlisted Organization"
        department = "Unknown"
        role_title = "Caller"
        caller_id = lookup_query or "Unknown"
        speaker_id = "UNKNOWN"
        identity_status = "UNVERIFIED"
        org_trust_status = "EXTERNAL_UNVERIFIED"
        mfa_enabled = False
        has_voice_enrollment = False

    # 2. Historical Call Statistics
    history_query = db.query(CallSession)
    if speaker and speaker.speaker_id:
        history_query = history_query.filter(
            or_(
                CallSession.claimed_identity == speaker.speaker_id,
                CallSession.caller_id == speaker.caller_id if speaker.caller_id else False,
            )
        )
    elif call and call.caller_id:
        history_query = history_query.filter(CallSession.caller_id == call.caller_id)
    else:
        history_query = history_query.filter(CallSession.caller_id == lookup_query)

    past_calls = history_query.all()
    previous_sessions_count = len(past_calls)

    # Average risk history across past calls
    call_ids = [c.id for c in past_calls]
    past_risks = (
        db.query(RiskAssessment.overall_risk_score)
        .filter(RiskAssessment.call_id.in_(call_ids))
        .all()
    ) if call_ids else []

    if past_risks:
        avg_risk = round(sum(r[0] for r in past_risks) / len(past_risks), 1)
    else:
        avg_risk = None

    # 3. Active Session Telemetry (if call session is provided or found)
    active_call_id = call.call_id if call else None
    latest_analysis = None
    latest_risk = None
    latest_decision = None

    if call:
        latest_analysis = (
            db.query(AudioAnalysis)
            .filter(AudioAnalysis.call_id == call.id)
            .order_by(AudioAnalysis.created_at.desc())
            .first()
        )
        latest_risk = (
            db.query(RiskAssessment)
            .filter(RiskAssessment.call_id == call.id)
            .order_by(RiskAssessment.created_at.desc())
            .first()
        )
        latest_decision = (
            db.query(SecurityDecision)
            .filter(SecurityDecision.call_id == call.id)
            .order_by(SecurityDecision.created_at.desc())
            .first()
        )

    # Speaker match formatting
    speaker_match_pct: Optional[int] = None
    speaker_verification_status = "NOT_EVALUATED"
    if latest_analysis:
        speaker_verification_status = latest_analysis.speaker_verification_status
        if latest_analysis.speaker_similarity is not None:
            # Scale cosine similarity [-1, 1] to percentage [0, 100]
            speaker_match_pct = max(0, min(100, int((latest_analysis.speaker_similarity + 1.0) / 2.0 * 100)))

    # Voice authenticity formatting
    voice_authenticity_status = "MODEL_NOT_CONFIGURED"
    deepfake_probability_pct: Optional[int] = None
    voice_authenticity_pct: Optional[int] = None
    if latest_analysis:
        voice_authenticity_status = latest_analysis.anti_spoof_status
        if latest_analysis.spoof_probability is not None:
            deepfake_probability_pct = int(latest_analysis.spoof_probability * 100)
            voice_authenticity_pct = int((1.0 - latest_analysis.spoof_probability) * 100)

    # Signals breakdown
    caller_risk_level = "LOW"
    behavior_risk_level = "LOW"
    transaction_risk_level = "LOW"
    overall_risk_score: Optional[float] = None
    overall_risk_level = "UNKNOWN"
    contributing_factors: List[str] = []

    if latest_risk:
        overall_risk_score = latest_risk.overall_risk_score
        overall_risk_level = latest_risk.risk_level
        signals = json.loads(latest_risk.signal_values_json) if latest_risk.signal_values_json else {}
        contributing_factors = json.loads(latest_risk.contributing_factors_json) if latest_risk.contributing_factors_json else []

        c_sig = signals.get("caller_context_signal", 0.0)
        caller_risk_level = "HIGH" if c_sig > 0.6 else "MEDIUM" if c_sig > 0.3 else "LOW"

        b_sig = signals.get("behavioral_signal", 0.0)
        behavior_risk_level = "HIGH" if b_sig > 0.6 else "MEDIUM" if b_sig > 0.3 else "LOW"

        t_sig = signals.get("transaction_sensitivity_signal", 0.0)
        transaction_risk_level = "HIGH" if t_sig > 0.6 else "MEDIUM" if t_sig > 0.3 else "LOW"

    # Recommended Security Action
    recommended_decision = latest_decision.decision if latest_decision else (
        "HOLD_SENSITIVE_ACTION" if overall_risk_level == "CRITICAL" else
        "STEP-UP VERIFICATION" if overall_risk_level == "HIGH" else
        "ADDITIONAL_VERIFICATION" if overall_risk_level == "MEDIUM" else
        "ALLOW" if overall_risk_level == "LOW" else "PENDING_AUDIO"
    )

    action_status = latest_decision.action_status if latest_decision else "PENDING"

    return {
        "caller_name": caller_name,
        "organization": organization,
        "department": department,
        "role_title": role_title,
        "caller_id": caller_id,
        "speaker_id": speaker_id,
        "identity_status": identity_status,
        "organization_trust_status": org_trust_status,
        "mfa_enabled": mfa_enabled,
        "has_voice_enrollment": has_voice_enrollment,
        "previous_sessions_count": previous_sessions_count,
        "average_historical_risk": avg_risk,
        "active_call_id": active_call_id,
        "active_call_status": call.status if call else None,
        "action_type": call.action_type if call else "GENERAL_INQUIRY",
        "action_sensitivity": call.action_sensitivity if call else "LOW",
        "transaction_amount": call.transaction_amount if call else None,
        "speaker_verification_status": speaker_verification_status,
        "speaker_match_percentage": speaker_match_pct,
        "voice_authenticity_status": voice_authenticity_status,
        "voice_authenticity_percentage": voice_authenticity_pct,
        "deepfake_probability_percentage": deepfake_probability_pct,
        "caller_risk_level": caller_risk_level,
        "behavior_risk_level": behavior_risk_level,
        "transaction_risk_level": transaction_risk_level,
        "overall_risk_score": overall_risk_score,
        "overall_risk_level": overall_risk_level,
        "contributing_factors": contributing_factors,
        "recommended_decision": recommended_decision,
        "action_status": action_status,
    }


@router.get("/lookup")
def lookup_caller_intelligence(
    query: Optional[str] = Query(None, description="Phone number, identity ID, or speaker name"),
    call_id: Optional[str] = Query(None, description="Active or past call session ID"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lookup comprehensive enterprise caller intelligence for an incoming or queried caller.
    Answers: 'Who is calling, is this actually them, does the voice appear authentic, and is it safe to trust?'
    """
    call = None
    if call_id:
        call = db.query(CallSession).filter(CallSession.call_id == call_id).first()

    speaker = None
    if call and call.claimed_identity:
        speaker = db.query(Speaker).filter(Speaker.speaker_id == call.claimed_identity).first()

    if not speaker and query:
        # Search by phone number, speaker_id, or name
        speaker = (
            db.query(Speaker)
            .filter(
                or_(
                    Speaker.caller_id == query,
                    Speaker.speaker_id == query,
                    Speaker.display_name.ilike(f"%{query}%"),
                )
            )
            .first()
        )

    if not speaker and not call and not query:
        # Fallback to the latest call session if one exists
        call = db.query(CallSession).order_by(CallSession.created_at.desc()).first()
        if call and call.claimed_identity:
            speaker = db.query(Speaker).filter(Speaker.speaker_id == call.claimed_identity).first()

    dossier = _build_intelligence_dossier(db=db, speaker=speaker, call=call, lookup_query=query)
    return dossier


@router.get("/recent", response_model=List[Dict[str, Any]])
def list_recent_caller_intelligence(
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns caller intelligence dossiers for recent communication sessions.
    Follows zero-mock policy: returns empty list when no calls exist.
    """
    recent_calls = db.query(CallSession).order_by(CallSession.created_at.desc()).limit(limit).all()
    results = []
    for c in recent_calls:
        sp = None
        if c.claimed_identity:
            sp = db.query(Speaker).filter(Speaker.speaker_id == c.claimed_identity).first()
        if not sp and c.caller_id:
            sp = db.query(Speaker).filter(Speaker.caller_id == c.caller_id).first()
        results.append(_build_intelligence_dossier(db=db, speaker=sp, call=c))
    return results
