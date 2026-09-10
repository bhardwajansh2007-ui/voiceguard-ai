from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RiskAssessmentResponse(BaseModel):
    id: str
    call_id: str
    overall_risk_score: float
    risk_level: str
    signal_values: Dict[str, float]
    weights_used: Dict[str, float]
    contributing_factors: List[str]
    risk_engine_version: str
    created_at: datetime


class SecurityDecisionResponse(BaseModel):
    id: str
    call_id: str
    decision: str  # ALLOW, ADDITIONAL_VERIFICATION, STRONG_VERIFICATION, HOLD_SENSITIVE_ACTION
    reason: str
    required_action: str
    action_status: str  # PENDING, RESOLVED_ALLOW, RESOLVED_BLOCKED, OVERRIDDEN
    analyst_notes: Optional[str]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SecurityActionUpdate(BaseModel):
    action_status: str = Field(..., description="RESOLVED_ALLOW, RESOLVED_BLOCKED, OVERRIDDEN")
    analyst_notes: Optional[str] = Field(default=None, max_length=1000)


class VerificationInitiateRequest(BaseModel):
    method: str = Field(default="SUPERVISOR_CALLBACK", description="MFA_CHALLENGE, SUPERVISOR_CALLBACK, SECONDARY_CHANNEL")
    details: Optional[str] = None


class VerificationResponse(BaseModel):
    id: str
    call_id: str
    method: str
    status: str
    details: Optional[str]
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
