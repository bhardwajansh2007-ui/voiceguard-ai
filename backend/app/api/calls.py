import json
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.database_models import (
    CallSession,
    AudioAnalysis,
    RiskAssessment,
    SecurityDecision,
    Speaker,
    SpeakerEmbedding,
)
from backend.app.schemas.call import CallCreate, CallContextUpdate, CallResponse
from backend.app.core.security import get_current_user
from backend.app.services.audio.validator import validate_audio_file
from backend.app.services.audio.preprocessor import AudioPreprocessor
from backend.app.services.audio.vad import vad_detector
from backend.app.services.ml.feature_extraction.acoustic import extractor
from backend.app.services.ml.anti_spoof.adapter import anti_spoof_adapter
from backend.app.services.ml.speaker_verification.adapter import speaker_verification_adapter
from backend.app.services.risk.behavioral import behavioral_engine
from backend.app.services.risk.context_engine import context_risk_engine
from backend.app.services.risk.fusion_engine import risk_fusion_engine
from backend.app.services.security.policy_engine import policy_engine
from backend.app.services.audit.ledger import audit_ledger
from backend.app.schemas.analysis import SpeakerVerificationResult
from backend.app.core.logging import logger

router = APIRouter(prefix="/calls", tags=["Call Sessions & Audio Pipeline"])


@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
def create_call(
    call_in: CallCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initializes a new monitored call session."""
    call_id = call_in.call_id or f"CALL-{uuid.uuid4().hex[:10].upper()}"

    existing = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Call session with identifier {call_id} already exists.",
        )

    call_session = CallSession(
        call_id=call_id,
        caller_id=call_in.caller_id,
        claimed_identity=call_in.claimed_identity,
        source_type=call_in.source_type or "COMMUNICATION_SANDBOX",
        action_type=call_in.action_type,
        action_sensitivity=call_in.action_sensitivity.upper(),
        transaction_amount=call_in.transaction_amount,
        authentication_state=call_in.authentication_state,
        status="ACTIVE",
    )
    db.add(call_session)
    db.commit()
    db.refresh(call_session)

    # Cryptographic audit entry
    audit_ledger.record_event(
        db=db,
        event_type="CALL_STARTED",
        payload={
            "call_id": call_id,
            "caller_id": call_in.caller_id,
            "claimed_identity": call_in.claimed_identity,
            "action_type": call_in.action_type,
            "sensitivity": call_in.action_sensitivity,
        },
        call_id=call_session.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    return call_session


@router.get("", response_model=List[CallResponse])
def list_calls(
    limit: int = 50,
    offset: int = 0,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves all call sessions. Follows zero-mock policy: returns empty list if no calls exist."""
    query = db.query(CallSession)
    if status_filter:
        query = query.filter(CallSession.status == status_filter.upper())
    calls = query.order_by(CallSession.created_at.desc()).offset(offset).limit(limit).all()
    return calls


@router.get("/{call_id}")
def get_call_detail(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves detailed intelligence for a specific call session."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    # Fetch latest analysis, risk assessment, and decision
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

    return {
        "call_id": call.call_id,
        "caller_id": call.caller_id,
        "claimed_identity": call.claimed_identity,
        "action_type": call.action_type,
        "action_sensitivity": call.action_sensitivity,
        "transaction_amount": call.transaction_amount,
        "authentication_state": call.authentication_state,
        "status": call.status,
        "created_at": call.created_at,
        "updated_at": call.updated_at,
        "latest_analysis": {
            "duration_seconds": latest_analysis.duration_seconds,
            "vad_speech_ratio": latest_analysis.vad_speech_ratio,
            "anti_spoof_status": latest_analysis.anti_spoof_status,
            "spoof_probability": latest_analysis.spoof_probability,
            "genuine_probability": latest_analysis.genuine_probability,
            "model_confidence": latest_analysis.model_confidence,
            "speaker_verification_status": latest_analysis.speaker_verification_status,
            "speaker_similarity": latest_analysis.speaker_similarity,
            "behavioral_risk_score": latest_analysis.behavioral_risk_score,
            "features": json.loads(latest_analysis.features_json) if latest_analysis.features_json else None,
            "analyzed_at": latest_analysis.created_at,
        } if latest_analysis else None,
        "latest_risk": {
            "overall_risk_score": latest_risk.overall_risk_score,
            "risk_level": latest_risk.risk_level,
            "signal_values": json.loads(latest_risk.signal_values_json),
            "weights_used": json.loads(latest_risk.weights_used_json),
            "contributing_factors": json.loads(latest_risk.contributing_factors_json),
            "evaluated_at": latest_risk.created_at,
        } if latest_risk else None,
        "latest_decision": {
            "decision": latest_decision.decision,
            "reason": latest_decision.reason,
            "required_action": latest_decision.required_action,
            "action_status": latest_decision.action_status,
            "analyst_notes": latest_decision.analyst_notes,
            "resolved_by": latest_decision.resolved_by,
            "decided_at": latest_decision.created_at,
        } if latest_decision else None,
    }


@router.patch("/{call_id}/context", response_model=CallResponse)
def update_call_context(
    call_id: str,
    update_in: CallContextUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates operational metadata for an active call session."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    for field, val in update_in.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(call, field, val)

    call.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(call)

    audit_ledger.record_event(
        db=db,
        event_type="CALL_CONTEXT_UPDATED",
        payload=update_in.model_dump(exclude_unset=True),
        call_id=call.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    return call


@router.post("/{call_id}/audio")
async def analyze_audio_upload(
    call_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Core audio analysis ingestion pipeline.
    Validates, normalizes, extracts physical features, runs anti-spoof inference,
    executes speaker verification, fuses multi-signal risk, and enforces security policy.
    Zero raw audio is persisted on disk.
    """
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    # 1. Read & Validate Audio File
    file_bytes = await file.read()
    validate_audio_file(file.filename, file_bytes)

    # 2. Decode and Preprocess to 16kHz Mono Float32
    raw_audio, orig_sr = AudioPreprocessor.load_wav_bytes(file_bytes)
    audio_data, duration_sec = AudioPreprocessor.normalize_audio(raw_audio, orig_sr)

    # 3. Voice Activity Detection (VAD)
    is_speech, vad_ratio, _ = vad_detector.process(audio_data)

    # 4. Feature Extraction (MFCC, Spectral, F0 Pitch, Jitter, Shimmer)
    acoustic_features = extractor.extract_features(audio_data, vad_speech_ratio=vad_ratio)

    # 5. ML Voice Anti-Spoofing Inference
    anti_spoof_res = anti_spoof_adapter.predict(audio_data)

    # 6. Speaker Verification (if claimed speaker identity is set)
    speaker_res = SpeakerVerificationResult(
        status="SKIPPED",
        similarity=None,
        confidence=0.0,
        claimed_speaker_id=call.claimed_identity,
    )

    if call.claimed_identity:
        speaker = (
            db.query(Speaker)
            .filter(Speaker.speaker_id == call.claimed_identity)
            .first()
        )
        if speaker and speaker.embeddings:
            # Enrolled embedding exists
            enrolled_embedding = json.loads(speaker.embeddings[0].embedding_json)
            # Compute current audio's speaker embedding
            current_embedding = speaker_verification_adapter.compute_embedding(audio_data)
            # Cosine similarity
            sim = speaker_verification_adapter.verify_similarity(enrolled_embedding, current_embedding)
            
            # Threshold: >= 0.55 similarity is MATCH
            match_status = "MATCH" if sim >= 0.55 else "MISMATCH"
            speaker_res = SpeakerVerificationResult(
                status=match_status,
                similarity=round(sim, 4),
                confidence=round(abs(sim), 4),
                claimed_speaker_id=call.claimed_identity,
            )
        else:
            speaker_res = SpeakerVerificationResult(
                status="NO_ENROLLMENT_FOUND",
                similarity=None,
                confidence=0.0,
                claimed_speaker_id=call.claimed_identity,
            )

    # 7. Behavioral & Prosodic Risk
    behavioral_score, behavioral_factors = behavioral_engine.evaluate(acoustic_features)

    # 8. Context & Transaction Risk
    caller_risk, trans_risk, context_factors = context_risk_engine.evaluate(
        action_type=call.action_type,
        action_sensitivity=call.action_sensitivity,
        transaction_amount=call.transaction_amount,
        caller_id=call.caller_id,
        authentication_state=call.authentication_state,
    )

    # 9. Risk Fusion
    (
        overall_score,
        risk_level,
        signals,
        weights_used,
        fusion_factors,
    ) = risk_fusion_engine.calculate_risk(
        anti_spoof=anti_spoof_res,
        speaker_res=speaker_res,
        behavioral_score=behavioral_score,
        caller_risk=caller_risk,
        transaction_risk=trans_risk,
    )

    all_factors = fusion_factors + behavioral_factors + context_factors

    # 10. Security Policy Decision
    decision, reason, required_action = policy_engine.evaluate_policy(
        risk_score=overall_score,
        risk_level=risk_level,
        action_type=call.action_type,
        action_sensitivity=call.action_sensitivity,
        transaction_amount=call.transaction_amount,
        spoof_probability=anti_spoof_res.spoof_probability,
        contributing_factors=all_factors,
    )

    # Update call status if held
    if decision == "HOLD_SENSITIVE_ACTION":
        call.status = "HOLD"

    # Persist Audio Analysis Record
    analysis_record = AudioAnalysis(
        call_id=call.id,
        duration_seconds=duration_sec,
        sample_rate=16000,
        vad_speech_ratio=vad_ratio,
        anti_spoof_status=anti_spoof_res.status,
        spoof_probability=anti_spoof_res.spoof_probability,
        genuine_probability=anti_spoof_res.genuine_probability,
        model_confidence=anti_spoof_res.confidence,
        speaker_verification_status=speaker_res.status,
        speaker_similarity=speaker_res.similarity,
        speaker_confidence=speaker_res.confidence,
        behavioral_risk_score=behavioral_score,
        features_json=json.dumps(acoustic_features.model_dump()),
        model_version=anti_spoof_res.model_version,
    )
    db.add(analysis_record)

    # Persist Risk Assessment Record
    risk_record = RiskAssessment(
        call_id=call.id,
        overall_risk_score=overall_score,
        risk_level=risk_level,
        signal_values_json=json.dumps(signals),
        weights_used_json=json.dumps(weights_used),
        contributing_factors_json=json.dumps(all_factors),
        risk_engine_version=risk_fusion_engine.VERSION,
    )
    db.add(risk_record)

    # Persist Security Decision Record
    decision_record = SecurityDecision(
        call_id=call.id,
        decision=decision,
        reason=reason,
        required_action=required_action,
        action_status="PENDING" if decision != "ALLOW" else "RESOLVED_ALLOW",
    )
    db.add(decision_record)
    db.commit()

    # Record Cryptographic Audit Events
    audit_ledger.record_event(
        db=db,
        event_type="ANALYSIS_COMPLETED",
        payload={
            "call_id": call_id,
            "duration": round(duration_sec, 2),
            "anti_spoof_status": anti_spoof_res.status,
            "speaker_verification": speaker_res.status,
            "overall_risk_score": overall_score,
            "risk_level": risk_level,
            "decision": decision,
        },
        call_id=call.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    if decision == "HOLD_SENSITIVE_ACTION":
        audit_ledger.record_event(
            db=db,
            event_type="SECURITY_HOLD_TRIGGERED",
            payload={
                "call_id": call_id,
                "reason": reason,
                "required_action": required_action,
                "risk_score": overall_score,
            },
            call_id=call.id,
            actor="SECURITY_POLICY_ENGINE",
        )

    return {
        "call_id": call.call_id,
        "duration_seconds": round(duration_sec, 2),
        "vad_speech_ratio": round(vad_ratio, 3),
        "anti_spoof": anti_spoof_res.model_dump(),
        "speaker_verification": speaker_res.model_dump(),
        "behavioral_risk_score": behavioral_score,
        "features": acoustic_features.model_dump(),
        "risk_assessment": {
            "overall_risk_score": overall_score,
            "risk_level": risk_level,
            "signal_values": signals,
            "weights_used": weights_used,
            "contributing_factors": all_factors,
        },
        "security_decision": {
            "decision": decision,
            "reason": reason,
            "required_action": required_action,
        },
    }


@router.post("/{call_id}/end")
def end_call_session(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks a call session as completed and records audit ledger seal."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Call session {call_id} not found.",
        )

    call.status = "COMPLETED"
    call.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(call)

    audit_ledger.record_event(
        db=db,
        event_type="CALL_COMPLETED",
        payload={"call_id": call_id, "status": "COMPLETED"},
        call_id=call.id,
        actor=current_user.get("sub", "SYSTEM"),
    )

    return {"status": "COMPLETED", "call_id": call_id}
