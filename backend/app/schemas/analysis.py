from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AcousticFeatures(BaseModel):
    duration_seconds: float
    sample_rate: int
    vad_speech_ratio: float
    rms_energy: float
    spectral_centroid: float
    spectral_bandwidth: float
    spectral_rolloff: float
    zero_crossing_rate: float
    fundamental_frequency_f0: float
    jitter_local: float
    shimmer_local: float
    mfcc_mean: List[float]


class AntiSpoofResult(BaseModel):
    status: str  # GENUINE, SPOOF, UNCERTAIN, MODEL_NOT_CONFIGURED
    spoof_probability: Optional[float]
    genuine_probability: Optional[float]
    confidence: float
    model_version: str


class SpeakerVerificationResult(BaseModel):
    status: str  # MATCH, MISMATCH, NO_ENROLLMENT_FOUND, SKIPPED
    similarity: Optional[float]
    confidence: float
    claimed_speaker_id: Optional[str]


class AnalysisResponse(BaseModel):
    id: str
    call_id: str
    duration_seconds: float
    sample_rate: int
    vad_speech_ratio: float
    anti_spoof: AntiSpoofResult
    speaker_verification: SpeakerVerificationResult
    behavioral_risk_score: float
    features: Optional[AcousticFeatures] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProgressiveAnalysisUpdate(BaseModel):
    call_id: str
    chunk_index: int
    window_duration: float
    vad_active: bool
    voice_authenticity: AntiSpoofResult
    speaker_verification: SpeakerVerificationResult
    behavioral_risk: float
    overall_risk_score: float
    risk_level: str
    recommended_action: str
    contributing_factors: List[str]
    timestamp: str
