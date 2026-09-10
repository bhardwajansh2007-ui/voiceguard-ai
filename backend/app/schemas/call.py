from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class CallCreate(BaseModel):
    call_id: Optional[str] = None
    caller_id: Optional[str] = Field(default=None, description="Phone number, SIP caller ID, or terminal ID")
    claimed_identity: Optional[str] = Field(default=None, description="Claimed speaker identity e.g. EMP-101")
    source_type: str = Field(default="COMMUNICATION_SANDBOX", description="COMMUNICATION_SANDBOX, MICROPHONE, AUDIO_UPLOAD, EXTERNAL_INTEGRATION")
    action_type: str = Field(default="GENERAL_INQUIRY", description="e.g. FINANCIAL_ACTION, CREDENTIAL_ACTION, CONFIDENTIAL_INFORMATION, ADMINISTRATIVE_ACTION")
    action_sensitivity: str = Field(default="LOW", description="LOW, MEDIUM, HIGH, CRITICAL")
    transaction_amount: Optional[float] = Field(default=None, description="Monetary transaction amount if any")
    authentication_state: str = Field(default="UNAUTHENTICATED", description="UNAUTHENTICATED, PARTIALLY_AUTHENTICATED, VERIFIED")


class CallContextUpdate(BaseModel):
    caller_id: Optional[str] = None
    claimed_identity: Optional[str] = None
    source_type: Optional[str] = None
    action_type: Optional[str] = None
    action_sensitivity: Optional[str] = None
    transaction_amount: Optional[float] = None
    authentication_state: Optional[str] = None


class CallResponse(BaseModel):
    id: str
    call_id: str
    caller_id: Optional[str]
    claimed_identity: Optional[str]
    source_type: str = "COMMUNICATION_SANDBOX"
    action_type: str
    action_sensitivity: str
    transaction_amount: Optional[float]
    authentication_state: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
