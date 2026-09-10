from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class ComponentHealth(BaseModel):
    status: str  # OPERATIONAL, DEGRADED, DOWN, NOT_CONFIGURED
    latency_ms: Optional[float] = None
    message: Optional[str] = None


class SystemHealthResponse(BaseModel):
    status: str  # HEALTHY, DEGRADED, UNHEALTHY
    app_name: str
    environment: str
    deployment_mode: str
    timestamp: datetime
    uptime_seconds: float
    components: Dict[str, ComponentHealth]


class ModelHealthResponse(BaseModel):
    anti_spoof_model: Dict[str, Any]
    speaker_verification_model: Dict[str, Any]
    device: str
    is_gpu_available: bool
    checked_at: datetime
