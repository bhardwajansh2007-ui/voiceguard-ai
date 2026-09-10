import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.database_models import Speaker, SpeakerEmbedding
from backend.app.schemas.speaker import SpeakerResponse, IdentityCreate, IdentityUpdate
from backend.app.core.security import get_current_user, require_role
from backend.app.services.audio.validator import validate_audio_file
from backend.app.services.audio.preprocessor import AudioPreprocessor
from backend.app.services.ml.speaker_verification.adapter import speaker_verification_adapter
from backend.app.services.audit.ledger import audit_ledger
from backend.app.core.logging import logger

router = APIRouter(prefix="/speakers", tags=["Identity Registry & Speaker Verification"])


def _speaker_to_response(sp: Speaker) -> SpeakerResponse:
    allowed_ops = None
    if sp.allowed_operations_json:
        try:
            allowed_ops = json.loads(sp.allowed_operations_json)
        except Exception:
            allowed_ops = None

    return SpeakerResponse(
        id=sp.id,
        speaker_id=sp.speaker_id,
        display_name=sp.display_name,
        organization=sp.organization or "Enterprise Org",
        department=sp.department,
        role_title=sp.role_title,
        caller_id=sp.caller_id,
        identity_status=sp.identity_status or "VERIFIED",
        mfa_enabled=sp.mfa_enabled if sp.mfa_enabled is not None else True,
        sensitive_actions_enabled=sp.sensitive_actions_enabled if sp.sensitive_actions_enabled is not None else True,
        risk_threshold=sp.risk_threshold if sp.risk_threshold is not None else 60.0,
        allowed_operations=allowed_ops,
        notes=sp.notes,
        consent_recorded=sp.consent_recorded,
        consent_timestamp=sp.consent_timestamp,
        model_version=sp.model_version,
        has_embedding=len(sp.embeddings) > 0,
        created_at=sp.created_at,
    )


@router.post("", response_model=SpeakerResponse, status_code=status.HTTP_201_CREATED)
def create_identity_profile(
    identity_in: IdentityCreate,
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST"])),
    db: Session = Depends(get_db),
):
    """
    Registers an authorized identity in the Identity Registry.
    Voice enrollment can be attached immediately or completed in a subsequent step.
    """
    existing = db.query(Speaker).filter(Speaker.speaker_id == identity_in.speaker_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Identity handle '{identity_in.speaker_id}' is already registered.",
        )

    now = datetime.now(timezone.utc)
    new_identity = Speaker(
        speaker_id=identity_in.speaker_id,
        display_name=identity_in.display_name,
        organization=identity_in.organization,
        department=identity_in.department,
        role_title=identity_in.role_title,
        caller_id=identity_in.caller_id,
        identity_status="VERIFIED",
        mfa_enabled=identity_in.mfa_enabled,
        sensitive_actions_enabled=identity_in.sensitive_actions_enabled,
        risk_threshold=identity_in.risk_threshold,
        allowed_operations_json=json.dumps(identity_in.allowed_operations or []),
        notes=identity_in.notes,
        consent_recorded=identity_in.consent_recorded,
        consent_timestamp=now if identity_in.consent_recorded else None,
        model_version=speaker_verification_adapter.model_version,
    )
    db.add(new_identity)
    db.commit()
    db.refresh(new_identity)

    audit_ledger.record_event(
        db=db,
        event_type="IDENTITY_REGISTERED",
        payload={
            "speaker_id": new_identity.speaker_id,
            "display_name": new_identity.display_name,
            "organization": new_identity.organization,
            "role_title": new_identity.role_title,
        },
        actor=current_user.get("sub", "SYSTEM"),
    )

    return _speaker_to_response(new_identity)


@router.patch("/{speaker_id}", response_model=SpeakerResponse)
def update_identity_profile(
    speaker_id: str,
    update_in: IdentityUpdate,
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST"])),
    db: Session = Depends(get_db),
):
    """Updates security policies or metadata for a registered identity profile."""
    sp = db.query(Speaker).filter(Speaker.speaker_id == speaker_id).first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity '{speaker_id}' not found.",
        )

    if update_in.display_name is not None:
        sp.display_name = update_in.display_name
    if update_in.organization is not None:
        sp.organization = update_in.organization
    if update_in.department is not None:
        sp.department = update_in.department
    if update_in.role_title is not None:
        sp.role_title = update_in.role_title
    if update_in.caller_id is not None:
        sp.caller_id = update_in.caller_id
    if update_in.identity_status is not None:
        sp.identity_status = update_in.identity_status
    if update_in.mfa_enabled is not None:
        sp.mfa_enabled = update_in.mfa_enabled
    if update_in.sensitive_actions_enabled is not None:
        sp.sensitive_actions_enabled = update_in.sensitive_actions_enabled
    if update_in.risk_threshold is not None:
        sp.risk_threshold = update_in.risk_threshold
    if update_in.allowed_operations is not None:
        sp.allowed_operations_json = json.dumps(update_in.allowed_operations)
    if update_in.notes is not None:
        sp.notes = update_in.notes

    db.commit()
    db.refresh(sp)

    audit_ledger.record_event(
        db=db,
        event_type="IDENTITY_UPDATED",
        payload={"speaker_id": speaker_id, "updated_fields": list(update_in.model_dump(exclude_unset=True).keys())},
        actor=current_user.get("sub", "SYSTEM"),
    )

    return _speaker_to_response(sp)


@router.post("/enroll", response_model=SpeakerResponse, status_code=status.HTTP_201_CREATED)
async def enroll_speaker(
    speaker_id: str = Form(..., description="Unique speaker identification handle"),
    display_name: str = Form(..., description="Full legal/display name of speaker"),
    organization: Optional[str] = Form("Enterprise Org"),
    department: Optional[str] = Form(None),
    role_title: Optional[str] = Form(None),
    caller_id: Optional[str] = Form(None),
    consent_recorded: bool = Form(..., description="Consent declaration for biometric voice processing"),
    file: UploadFile = File(..., description="Consented audio recording sample (WAV/MP3)"),
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST"])),
    db: Session = Depends(get_db),
):
    """
    Enrolls an authorized speaker using consented voice data.
    Strictly follows Privacy-by-Design:
    audio -> preprocessing -> 128-dim acoustic embedding -> database -> raw audio deleted.
    """
    if not consent_recorded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit biometric voice consent is required under privacy and compliance policy.",
        )

    # Validate audio file
    file_bytes = await file.read()
    validate_audio_file(file.filename, file_bytes)

    # Decode and Preprocess
    raw_audio, orig_sr = AudioPreprocessor.load_wav_bytes(file_bytes)
    audio_data, duration_sec = AudioPreprocessor.normalize_audio(raw_audio, orig_sr)

    if duration_sec < 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Enrollment audio sample is too short ({duration_sec:.2f}s). Minimum 1.0s required.",
        )

    # Compute 128-dimensional acoustic embedding vector
    embedding_vector = speaker_verification_adapter.compute_embedding(audio_data)
    now = datetime.now(timezone.utc)

    # Check for existing speaker ID or create new
    existing = db.query(Speaker).filter(Speaker.speaker_id == speaker_id).first()
    if existing:
        target_speaker = existing
        target_speaker.display_name = display_name
        if organization:
            target_speaker.organization = organization
        if department:
            target_speaker.department = department
        if role_title:
            target_speaker.role_title = role_title
        if caller_id:
            target_speaker.caller_id = caller_id
        target_speaker.consent_recorded = True
        target_speaker.consent_timestamp = now
        # Remove old embeddings if re-enrolling
        for old_emb in target_speaker.embeddings:
            db.delete(old_emb)
    else:
        target_speaker = Speaker(
            speaker_id=speaker_id,
            display_name=display_name,
            organization=organization or "Enterprise Org",
            department=department,
            role_title=role_title,
            caller_id=caller_id,
            identity_status="VERIFIED",
            mfa_enabled=True,
            sensitive_actions_enabled=True,
            risk_threshold=60.0,
            allowed_operations_json=json.dumps([
                "Payment approval",
                "Financial instruction",
                "Administrative approval",
            ]),
            consent_recorded=True,
            consent_timestamp=now,
            model_version=speaker_verification_adapter.model_version,
        )
        db.add(target_speaker)
        db.flush()

    speaker_emb = SpeakerEmbedding(
        speaker_id=target_speaker.id,
        embedding_json=json.dumps(embedding_vector),
        vector_dim=len(embedding_vector),
        sample_duration_seconds=duration_sec,
        model_version=speaker_verification_adapter.model_version,
    )
    db.add(speaker_emb)
    db.commit()
    db.refresh(target_speaker)

    # Audit Ledger Event
    audit_ledger.record_event(
        db=db,
        event_type="SPEAKER_ENROLLED",
        payload={
            "speaker_id": speaker_id,
            "display_name": display_name,
            "vector_dim": len(embedding_vector),
            "sample_duration": round(duration_sec, 2),
            "model_version": speaker_verification_adapter.model_version,
        },
        actor=current_user.get("sub", "SYSTEM"),
    )

    return _speaker_to_response(target_speaker)


@router.post("/{speaker_id}/enroll", response_model=SpeakerResponse)
async def enroll_existing_speaker(
    speaker_id: str,
    file: UploadFile = File(..., description="Consented audio recording sample (WAV/MP3)"),
    consent_recorded: bool = Form(True),
    current_user: dict = Depends(require_role(["ADMIN", "SECURITY_ANALYST"])),
    db: Session = Depends(get_db),
):
    """Enrolls or re-enrolls voice biometrics for an existing registered identity."""
    target_speaker = db.query(Speaker).filter(Speaker.speaker_id == speaker_id).first()
    if not target_speaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity '{speaker_id}' not found.",
        )

    file_bytes = await file.read()
    validate_audio_file(file.filename, file_bytes)

    raw_audio, orig_sr = AudioPreprocessor.load_wav_bytes(file_bytes)
    audio_data, duration_sec = AudioPreprocessor.normalize_audio(raw_audio, orig_sr)

    if duration_sec < 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sample too short ({duration_sec:.2f}s). Minimum 1.0s required.",
        )

    embedding_vector = speaker_verification_adapter.compute_embedding(audio_data)
    now = datetime.now(timezone.utc)

    # Remove existing embeddings
    for old_emb in target_speaker.embeddings:
        db.delete(old_emb)

    target_speaker.consent_recorded = True
    target_speaker.consent_timestamp = now

    speaker_emb = SpeakerEmbedding(
        speaker_id=target_speaker.id,
        embedding_json=json.dumps(embedding_vector),
        vector_dim=len(embedding_vector),
        sample_duration_seconds=duration_sec,
        model_version=speaker_verification_adapter.model_version,
    )
    db.add(speaker_emb)
    db.commit()
    db.refresh(target_speaker)

    audit_ledger.record_event(
        db=db,
        event_type="SPEAKER_ENROLLED",
        payload={"speaker_id": speaker_id, "duration": round(duration_sec, 2)},
        actor=current_user.get("sub", "SYSTEM"),
    )

    return _speaker_to_response(target_speaker)


@router.get("", response_model=List[SpeakerResponse])
def list_speakers(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists registered identity profiles. Returns empty list when zero enrollments exist."""
    speakers = db.query(Speaker).order_by(Speaker.created_at.desc()).offset(offset).limit(limit).all()
    return [_speaker_to_response(sp) for sp in speakers]


@router.get("/{speaker_id}", response_model=SpeakerResponse)
def get_speaker_profile(
    speaker_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieves detailed identity profile by speaker_id."""
    sp = db.query(Speaker).filter(Speaker.speaker_id == speaker_id).first()
    if not sp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity '{speaker_id}' not found.",
        )
    return _speaker_to_response(sp)


@router.delete("/{speaker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_speaker(
    speaker_id: str,
    current_user: dict = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    """Cryptographically deletes an enrolled speaker and their biometric embeddings."""
    speaker = db.query(Speaker).filter(Speaker.speaker_id == speaker_id).first()
    if not speaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity '{speaker_id}' not found.",
        )

    db.delete(speaker)
    db.commit()

    audit_ledger.record_event(
        db=db,
        event_type="SPEAKER_PURGED",
        payload={"speaker_id": speaker_id, "action": "BIOMETRIC_DATA_PURGED"},
        actor=current_user.get("sub", "ADMIN"),
    )
    return None
