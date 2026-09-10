from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: str
    event_id: str
    call_id: Optional[str]
    event_type: str
    payload: Dict[str, Any]
    payload_hash: str
    previous_event_hash: str
    event_hash: str
    actor: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditChainVerificationResponse(BaseModel):
    is_valid: bool
    total_events_checked: int
    genesis_hash_verified: bool
    tampered_event_id: Optional[str] = None
    verification_message: str
    verified_at: datetime
