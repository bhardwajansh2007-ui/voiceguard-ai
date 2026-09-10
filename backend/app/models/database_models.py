import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    DateTime,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default="SECURITY_ANALYST")  # ADMIN, SECURITY_ANALYST, AUTHORIZED_OPERATOR
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class Speaker(Base):
    """Registered authorized identity with explicitly consented voice samples and security profile."""
    __tablename__ = "speakers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    speaker_id = Column(String(64), unique=True, nullable=False, index=True)  # Public unique identifier (e.g. EMP-9021)
    display_name = Column(String(128), nullable=False)
    organization = Column(String(128), nullable=False, default="Enterprise Org")
    department = Column(String(128), nullable=True)
    role_title = Column(String(128), nullable=True)  # e.g. Finance Director
    caller_id = Column(String(128), nullable=True, index=True)  # Associated phone / SIP URI (e.g. +91 98765 43210)
    identity_status = Column(String(32), nullable=False, default="VERIFIED")  # VERIFIED, PENDING, SUSPENDED
    mfa_enabled = Column(Boolean, default=True, nullable=False)
    sensitive_actions_enabled = Column(Boolean, default=True, nullable=False)
    risk_threshold = Column(Float, default=60.0, nullable=False)  # Require additional verification above this score
    allowed_operations_json = Column(Text, nullable=True)  # JSON list of allowed sensitive actions
    notes = Column(Text, nullable=True)
    consent_recorded = Column(Boolean, default=False, nullable=False)
    consent_timestamp = Column(DateTime(timezone=True), nullable=True)
    model_version = Column(String(64), nullable=False, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    embeddings = relationship("SpeakerEmbedding", back_populates="speaker", cascade="all, delete-orphan")


class SpeakerEmbedding(Base):
    """
    Cryptographic/Acoustic representation vector for speaker verification.
    Zero raw audio is retained; only the embedding is stored.
    """
    __tablename__ = "speaker_embeddings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    speaker_id = Column(String(36), ForeignKey("speakers.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding_json = Column(Text, nullable=False)  # JSON-encoded array of floating point weights
    vector_dim = Column(Integer, nullable=False, default=128)
    sample_duration_seconds = Column(Float, nullable=False)
    model_version = Column(String(64), nullable=False, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    speaker = relationship("Speaker", back_populates="embeddings")


class CallSession(Base):
    """Monitored communication session."""
    __tablename__ = "call_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(64), unique=True, nullable=False, index=True)
    caller_id = Column(String(128), nullable=True)  # Phone number, SIP URI, or system caller tag
    claimed_identity = Column(String(64), nullable=True, index=True)  # Matches speaker_id if claiming known identity
    source_type = Column(String(32), nullable=False, default="COMMUNICATION_SANDBOX", index=True)  # COMMUNICATION_SANDBOX, MICROPHONE, AUDIO_UPLOAD, EXTERNAL_INTEGRATION
    action_type = Column(String(64), nullable=False, default="GENERAL_INQUIRY")  # FINANCIAL_ACTION, CREDENTIAL_ACTION, CONFIDENTIAL_INFORMATION, ADMINISTRATIVE_ACTION, OTHER_SENSITIVE_ACTION
    action_sensitivity = Column(String(32), nullable=False, default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    transaction_amount = Column(Float, nullable=True)  # Optional financial amount
    authentication_state = Column(String(32), nullable=False, default="UNAUTHENTICATED")  # UNAUTHENTICATED, PARTIALLY_AUTHENTICATED, VERIFIED
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, HOLD, VERIFIED, COMPLETED, TERMINATED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    analyses = relationship("AudioAnalysis", back_populates="call", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="call", cascade="all, delete-orphan")
    security_decisions = relationship("SecurityDecision", back_populates="call", cascade="all, delete-orphan")
    verification_requests = relationship("VerificationRequest", back_populates="call", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="call", cascade="all, delete-orphan")


class AudioAnalysis(Base):
    """Acoustic feature analysis and anti-spoof inference record."""
    __tablename__ = "audio_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_seconds = Column(Float, nullable=False)
    sample_rate = Column(Integer, nullable=False, default=16000)
    vad_speech_ratio = Column(Float, nullable=False, default=0.0)
    
    # ML Anti-Spoof Signals
    anti_spoof_status = Column(String(32), nullable=False, default="MODEL_NOT_CONFIGURED")  # GENUINE, SPOOF, UNCERTAIN, MODEL_NOT_CONFIGURED
    spoof_probability = Column(Float, nullable=True)  # 0.0 to 1.0, None if model not configured
    genuine_probability = Column(Float, nullable=True)  # 0.0 to 1.0, None if model not configured
    model_confidence = Column(Float, nullable=False, default=0.0)

    # Speaker Verification Signals
    speaker_verification_status = Column(String(32), nullable=False, default="SKIPPED")  # MATCH, MISMATCH, NO_ENROLLMENT_FOUND, SKIPPED
    speaker_similarity = Column(Float, nullable=True)  # Cosine similarity -1.0 to 1.0, None if not checked
    speaker_confidence = Column(Float, nullable=False, default=0.0)

    # Behavioral / Acoustic Signals
    behavioral_risk_score = Column(Float, nullable=False, default=0.0)  # 0.0 to 1.0
    features_json = Column(Text, nullable=True)  # Extracted acoustic features (MFCC, centroid, pitch, etc.)
    model_version = Column(String(64), nullable=False, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    call = relationship("CallSession", back_populates="analyses")


class RiskAssessment(Base):
    """Fused risk score synthesizing all independent security signals."""
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_risk_score = Column(Float, nullable=False)  # 0.0 to 100.0
    risk_level = Column(String(32), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Explainability Data
    signal_values_json = Column(Text, nullable=False)  # JSON dict of normalized 0-1 signals
    weights_used_json = Column(Text, nullable=False)   # JSON dict of weights applied
    contributing_factors_json = Column(Text, nullable=False)  # JSON array of human-readable factor explanations
    risk_engine_version = Column(String(64), nullable=False, default="v1.0.0")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    call = relationship("CallSession", back_populates="risk_assessments")


class SecurityDecision(Base):
    """Enforceable security decision generated by the Security Policy Engine."""
    __tablename__ = "security_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    decision = Column(String(32), nullable=False)  # ALLOW, ADDITIONAL_VERIFICATION, STRONG_VERIFICATION, HOLD_SENSITIVE_ACTION
    reason = Column(Text, nullable=False)
    required_action = Column(String(64), nullable=False)  # NONE, OUT_OF_BAND_CALLBACK, MFA_PUSH, SUPERVISOR_OVERRIDE
    action_status = Column(String(32), nullable=False, default="PENDING")  # PENDING, RESOLVED_ALLOW, RESOLVED_BLOCKED, OVERRIDDEN
    analyst_notes = Column(Text, nullable=True)
    resolved_by = Column(String(64), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    call = relationship("CallSession", back_populates="security_decisions")


class VerificationRequest(Base):
    """Independent verification workflow record."""
    __tablename__ = "verification_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    call_id = Column(String(36), ForeignKey("call_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    method = Column(String(64), nullable=False)  # MFA_CHALLENGE, SUPERVISOR_CALLBACK, SECONDARY_CHANNEL
    status = Column(String(32), nullable=False, default="INITIATED")  # INITIATED, VERIFIED, FAILED, EXPIRED
    details = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    call = relationship("CallSession", back_populates="verification_requests")


class AuditEvent(Base):
    """Tamper-evident hash-chained audit event."""
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(64), unique=True, nullable=False, index=True)
    call_id = Column(String(36), ForeignKey("call_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)  # CALL_STARTED, ANALYSIS_COMPLETED, RISK_EVALUATED, SECURITY_HOLD, etc.
    payload_json = Column(Text, nullable=False)
    payload_hash = Column(String(64), nullable=False)
    previous_event_hash = Column(String(64), nullable=False)
    event_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256(prev_hash + type + timestamp + payload_hash)
    actor = Column(String(64), nullable=False, default="SYSTEM")
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    call = relationship("CallSession", back_populates="audit_events")


class ModelVersion(Base):
    """Registry of loaded machine learning architectures and checkpoints."""
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(64), nullable=False)  # AntiSpoofModel, SpeakerVerificationModel
    version_tag = Column(String(64), nullable=False)
    framework = Column(String(64), nullable=False)  # PyTorch, SciPy-Acoustic, ONNX
    is_active = Column(Boolean, default=True, nullable=False)
    metrics_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class SystemConfiguration(Base):
    """Persistent dynamic system parameters."""
    __tablename__ = "system_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    config_key = Column(String(64), unique=True, nullable=False, index=True)
    config_value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
