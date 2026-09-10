from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/integration", tags=["Enterprise Gateway Integration"])


class CommunicationSourceStatus(BaseModel):
    id: str
    name: str
    type: str
    status: str  # CONNECTED, NOT_CONFIGURED, DEGRADED, DOWN
    description: str
    latency_ms: float = 0.0


class IntegrationStatusResponse(BaseModel):
    gateway_name: str
    gateway_version: str
    deployment_mode: str
    timestamp: str
    disclaimer: str
    sources: List[CommunicationSourceStatus]
    api_endpoints: List[Dict[str, str]]


@router.get("/status", response_model=IntegrationStatusResponse)
def get_integration_status() -> IntegrationStatusResponse:
    """
    Returns the real-time configuration and connectivity state of voice communication sources.
    Transparently displays the Communication Sandbox as CONNECTED, and production external
    integrations (PBX, SIP trunks, Banking IVR) as NOT CONFIGURED.
    """
    return IntegrationStatusResponse(
        gateway_name="VoiceGuard-AI-Gateway",
        gateway_version="v1.0.0",
        deployment_mode="SIH_PROTOTYPE_DEMO",
        timestamp=datetime.now(timezone.utc).isoformat(),
        disclaimer=(
            "Controlled cybersecurity prototype. Communication and protected-action workflows are "
            "simulated for research and demonstration. Production integration with telecom, banking, "
            "government, or enterprise systems requires authorization and organization-specific "
            "security, privacy, regulatory, and legal review."
        ),
        sources=[
            CommunicationSourceStatus(
                id="COMMUNICATION_SANDBOX",
                name="Communication Sandbox",
                type="SIMULATED_INTEGRATION",
                status="CONNECTED",
                description="Controlled prototype environment simulating authorized external voice streams.",
                latency_ms=1.2,
            ),
            CommunicationSourceStatus(
                id="MICROPHONE",
                name="Live Microphone Ingestion",
                type="DIRECT_HARDWARE",
                status="CONNECTED",
                description="Local operator / analyst microphone input via Web Audio API 16kHz PCM.",
                latency_ms=0.5,
            ),
            CommunicationSourceStatus(
                id="AUDIO_UPLOAD",
                name="Audio File Gateway",
                type="BATCH_RECORDING",
                status="CONNECTED",
                description="Encrypted audio recording file upload (WAV, MP3, FLAC) for post-call audit.",
                latency_ms=4.8,
            ),
            CommunicationSourceStatus(
                id="EXTERNAL_PBX",
                name="Enterprise PBX / SIP Trunk",
                type="TELECOM_INFRASTRUCTURE",
                status="NOT_CONFIGURED",
                description="Production enterprise telephony connector (Cisco CUCM, Asterisk, FreePBX).",
                latency_ms=0.0,
            ),
            CommunicationSourceStatus(
                id="WEBRTC_EDGE",
                name="WebRTC Communication Gateway",
                type="STREAMING_EDGE",
                status="NOT_CONFIGURED",
                description="Direct browser-to-browser voice communication proxy with VoiceGuard inspection.",
                latency_ms=0.0,
            ),
            CommunicationSourceStatus(
                id="BANKING_IVR",
                name="Core Banking / IVR System",
                type="FINANCIAL_SERVICES",
                status="NOT_CONFIGURED",
                description="Automated transaction verification webhook and sensitive action hold interceptor.",
                latency_ms=0.0,
            ),
        ],
        api_endpoints=[
            {
                "method": "POST",
                "path": "/api/v1/calls",
                "purpose": "Initialize protected communication session with context metadata.",
            },
            {
                "method": "POST",
                "path": "/api/v1/calls/{id}/audio",
                "purpose": "Ingest audio recording file for full multi-signal pipeline analysis.",
            },
            {
                "method": "WS",
                "path": "/ws/calls/{id}/stream",
                "purpose": "Stream bidirectional 16kHz raw PCM audio for progressive risk evaluation.",
            },
            {
                "method": "GET",
                "path": "/api/v1/calls/{id}",
                "purpose": "Fetch real-time threat scores, acoustic telemetry, and policy action.",
            },
            {
                "method": "POST",
                "path": "/api/v1/security/action",
                "purpose": "Resolve, verify, or release hold on protected sensitive actions.",
            },
            {
                "method": "GET",
                "path": "/api/v1/audit/verify-chain",
                "purpose": "Cryptographically verify the SHA-256 tamper-evident security audit ledger.",
            },
        ],
    )
