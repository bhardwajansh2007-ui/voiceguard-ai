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
from backend.app.core.config import settings
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
from backend.app.services.audio.quality_engine import quality_engine
from backend.app.services.ml.anti_spoof.replay_detector import replay_detector
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


@router.post("/demo/reset")
def reset_demo_state(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    SIH Evaluator Demo Reset:
    Resets transient demo state: terminates active call sessions without wiping
    permanent speaker biometric baselines, trained model weights, or audit history.
    """
    active_calls = db.query(CallSession).filter(CallSession.status.in_(["ACTIVE", "HOLD"])).all()
    for c in active_calls:
        c.status = "TERMINATED"
        c.updated_at = datetime.now(timezone.utc)
    db.commit()

    audit_ledger.record_event(
        db=db,
        event_type="DEMO_STATE_RESET",
        payload={"terminated_sessions": len(active_calls)},
        actor=current_user.get("sub", "EVALUATOR"),
    )

    return {
        "status": "RESET_SUCCESSFUL",
        "terminated_active_sessions": len(active_calls),
        "message": "Demo call state reset cleanly. Biometric profiles and models preserved.",
    }


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


@router.get("/{call_id}/risk")
def get_call_risk(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authoritative endpoint returning fused risk score and signal breakdown."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail=f"Call session {call_id} not found.")
    risk = db.query(RiskAssessment).filter(RiskAssessment.call_id == call.id).order_by(RiskAssessment.created_at.desc()).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk assessment not available for this session.")
    return {
        "call_id": call_id,
        "overall_risk_score": risk.overall_risk_score,
        "risk_level": risk.risk_level,
        "signal_values": json.loads(risk.signal_values_json) if risk.signal_values_json else {},
        "weights_used": json.loads(risk.weights_used_json) if risk.weights_used_json else {},
        "contributing_factors": json.loads(risk.contributing_factors_json) if risk.contributing_factors_json else [],
        "assessed_at": risk.created_at,
    }


@router.get("/{call_id}/analysis")
def get_call_analysis(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authoritative endpoint returning full physical and ML acoustic analysis."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail=f"Call session {call_id} not found.")
    analysis = db.query(AudioAnalysis).filter(AudioAnalysis.call_id == call.id).order_by(AudioAnalysis.created_at.desc()).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Audio analysis not available for this session.")
    return {
        "call_id": call_id,
        "duration_seconds": analysis.duration_seconds,
        "sample_rate": analysis.sample_rate,
        "vad_speech_ratio": analysis.vad_speech_ratio,
        "deepfake_status": analysis.anti_spoof_status,
        "deepfake_score": analysis.spoof_probability,
        "authenticity_score": analysis.genuine_probability,
        "confidence": analysis.model_confidence,
        "speaker_status": analysis.speaker_verification_status,
        "speaker_similarity": analysis.speaker_similarity,
        "behavioral_risk": analysis.behavioral_risk_score,
        "model_version": analysis.model_version,
        "analyzed_at": analysis.created_at,
    }


@router.get("/{call_id}/timeline")
def get_call_timeline(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns chronologically ordered windowed analysis segments for temporal integrity visualization."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail=f"Call session {call_id} not found.")
    analyses = db.query(AudioAnalysis).filter(AudioAnalysis.call_id == call.id).order_by(AudioAnalysis.created_at.asc()).all()
    timeline = []
    for idx, a in enumerate(analyses):
        timeline.append({
            "segment_index": idx,
            "duration_seconds": a.duration_seconds,
            "anti_spoof_status": a.anti_spoof_status,
            "authenticity_score": a.genuine_probability,
            "spoof_probability": a.spoof_probability,
            "confidence": a.model_confidence,
            "speaker_similarity": a.speaker_similarity,
            "timestamp": a.created_at,
        })
    return {
        "call_id": call_id,
        "total_segments": len(timeline),
        "timeline": timeline,
    }


@router.get("/{call_id}/audit")
def get_call_audit_trail(
    call_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the cryptographically sealed audit trail for this call session."""
    call = db.query(CallSession).filter(CallSession.call_id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail=f"Call session {call_id} not found.")
    from backend.app.models.database_models import AuditEvent
    events = db.query(AuditEvent).filter(AuditEvent.call_id == call.id).order_by(AuditEvent.created_at.asc()).all()
    return [
        {
            "event_id": e.event_id,
            "event_type": e.event_type,
            "event_hash": e.event_hash,
            "previous_event_hash": e.previous_event_hash,
            "actor": e.actor,
            "created_at": e.created_at,
            "payload": json.loads(e.payload_json) if e.payload_json else {},
        }
        for e in events
    ]


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

    # Compute Forensic Audio Integrity Hash
    import hashlib
    audio_sha256 = hashlib.sha256(audio_data.tobytes()).hexdigest()
    diagnostic = {
        "audio_sha256": audio_sha256,
        "duration_seconds": round(duration_sec, 3),
        "sample_rate": 16000,
        "sample_count": len(audio_data),
        "vad_speech_ratio": round(vad_ratio, 3),
        "inference_device": anti_spoof_adapter.device,
        "inference_timestamp": datetime.now(timezone.utc).isoformat(),
    }
    logger.info(
        f"Forensic audio inference: call={call_id} sha256={audio_sha256[:16]}... "
        f"samples={len(audio_data)} dur={duration_sec:.2f}s device={anti_spoof_adapter.device}"
    )

    # 4. Feature Extraction (MFCC, Spectral, F0 Pitch, Jitter, Shimmer)
    acoustic_features = extractor.extract_features(audio_data, vad_speech_ratio=vad_ratio)

    # 5. ML Voice Anti-Spoofing Inference
    anti_spoof_res = anti_spoof_adapter.predict(audio_data)

    # Signal Quality & Replay Anomaly Evaluation
    quality_report = quality_engine.analyze(audio_data, 16000, vad_ratio, anti_spoof_res.genuine_probability)
    replay_res = replay_detector.analyze(audio_data, 16000)
    diagnostic["audio_quality"] = quality_report.audio_quality
    diagnostic["quality_score"] = quality_report.quality_score
    diagnostic["analysis_confidence"] = quality_report.analysis_confidence
    diagnostic["uncertainty_reason"] = quality_report.uncertainty_reason
    diagnostic["replay_likelihood"] = replay_res.replay_likelihood
    diagnostic["replay_status"] = replay_res.status

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
            
            emb_hash = hashlib.sha256(json.dumps(current_embedding).encode()).hexdigest()[:16]
            ref_hash = hashlib.sha256(speaker.embeddings[0].embedding_json.encode()).hexdigest()[:16]
            diagnostic["embedding_hash"] = emb_hash
            diagnostic["reference_embedding_hash"] = ref_hash
            diagnostic["speaker_similarity"] = round(sim, 4)
            logger.info(
                f"Speaker biometric verification: call={call_id} speaker={call.claimed_identity} "
                f"sim={sim:.4f} cur_emb_hash={emb_hash} ref_emb_hash={ref_hash}"
            )

            # Calibrated Threshold from Phase 1E empirical sweep
            spk_thresh = getattr(settings, "SPEAKER_VERIFICATION_THRESHOLD", 0.880)
            match_status = "MATCH" if sim >= spk_thresh else "MISMATCH"
            conf_level = "HIGH" if sim >= 0.92 else ("MEDIUM" if sim >= spk_thresh else "LOW")
            
            speaker_res = SpeakerVerificationResult(
                status=match_status,
                similarity=round(sim, 4),
                confidence=round(abs(sim), 4),
                confidence_level=conf_level,
                claimed_speaker_id=call.claimed_identity,
                reference_id=call.claimed_identity,
                model={
                    "name": "SpeakerVerification-AcousticEmbed",
                    "version": speaker_verification_adapter.model_version,
                    "type": "Handcrafted 128-D Acoustic Vector",
                },
                input_audio_hash=audio_sha256,
                reference_embedding_hash=ref_hash,
            )
        else:
            speaker_res = SpeakerVerificationResult(
                status="NO_ENROLLMENT_FOUND",
                similarity=None,
                confidence=0.0,
                confidence_level="N/A",
                claimed_speaker_id=call.claimed_identity,
                reference_id=None,
                model={
                    "name": "SpeakerVerification-AcousticEmbed",
                    "version": speaker_verification_adapter.model_version,
                    "type": "Handcrafted 128-D Acoustic Vector",
                },
                input_audio_hash=audio_sha256,
                reference_embedding_hash=None,
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
        "diagnostic": diagnostic,
        "quality_report": quality_report.to_dict(),
        "replay_analysis": replay_res.to_dict(),
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
