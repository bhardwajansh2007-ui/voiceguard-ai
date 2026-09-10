from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SpeakerEnrollmentRequest(BaseModel):
    speaker_id: str = Field(..., min_length=2, max_length=64, description="Unique organizational speaker ID")
    display_name: str = Field(..., min_length=2, max_length=128)
    organization: Optional[str] = "Enterprise Org"
    department: Optional[str] = None
    role_title: Optional[str] = None
    caller_id: Optional[str] = None
    consent_recorded: bool = Field(..., description="Explicit user consent to extract voice biometric embeddings")


class IdentityCreate(BaseModel):
    speaker_id: str = Field(..., min_length=2, max_length=64, description="Unique identity identifier e.g. EMP-9021")
    display_name: str = Field(..., min_length=2, max_length=128)
    organization: str = Field(default="Enterprise Org", max_length=128)
    department: Optional[str] = None
    role_title: Optional[str] = None
    caller_id: Optional[str] = None
    mfa_enabled: bool = True
    sensitive_actions_enabled: bool = True
    risk_threshold: float = 60.0
    allowed_operations: Optional[List[str]] = [
        "Payment approval",
        "Financial instruction",
        "Administrative approval",
    ]
    notes: Optional[str] = None
    consent_recorded: bool = True


class IdentityUpdate(BaseModel):
    display_name: Optional[str] = None
    organization: Optional[str] = None
    department: Optional[str] = None
    role_title: Optional[str] = None
    caller_id: Optional[str] = None
    identity_status: Optional[str] = None  # VERIFIED, PENDING, SUSPENDED
    mfa_enabled: Optional[bool] = None
    sensitive_actions_enabled: Optional[bool] = None
    risk_threshold: Optional[float] = None
    allowed_operations: Optional[List[str]] = None
    notes: Optional[str] = None


class SpeakerResponse(BaseModel):
    id: str
    speaker_id: str
    display_name: str
    organization: Optional[str] = "Enterprise Org"
    department: Optional[str] = None
    role_title: Optional[str] = None
    caller_id: Optional[str] = None
    identity_status: Optional[str] = "VERIFIED"
    mfa_enabled: Optional[bool] = True
    sensitive_actions_enabled: Optional[bool] = True
    risk_threshold: Optional[float] = 60.0
    allowed_operations: Optional[List[str]] = None
    notes: Optional[str] = None
    consent_recorded: bool
    consent_timestamp: Optional[datetime]
    model_version: str
    has_embedding: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
