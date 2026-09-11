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


class AudioDiagnosticMetadata(BaseModel):
    audio_sha256: str
    duration_seconds: float
    sample_rate: int
    sample_count: int
    vad_speech_ratio: float
    inference_device: str
    inference_timestamp: datetime
    embedding_hash: Optional[str] = None
    reference_embedding_hash: Optional[str] = None
    speaker_similarity: Optional[float] = None


class AntiSpoofResult(BaseModel):
    status: str  # GENUINE, SPOOF, UNCERTAIN, MODEL_NOT_CONFIGURED
    spoof_probability: Optional[float]  # Model spoof score in [0.0, 1.0] (heuristic mapping, non-calibrated)
    genuine_probability: Optional[float]  # Model authenticity score in [0.0, 1.0]
    confidence: float
    model_version: str


class SpeakerVerificationResult(BaseModel):
    status: str  # MATCH, MISMATCH, NO_ENROLLMENT_FOUND, SKIPPED, UNAVAILABLE
    similarity: Optional[float] = None
    confidence: float = 0.0
    confidence_level: Optional[str] = None  # HIGH, MEDIUM, LOW, N/A
    claimed_speaker_id: Optional[str] = None
    reference_id: Optional[str] = None
    model: Optional[Dict[str, str]] = None
    input_audio_hash: Optional[str] = None
    reference_embedding_hash: Optional[str] = None


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
    diagnostic: Optional[AudioDiagnosticMetadata] = None
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
    diagnostic: Optional[AudioDiagnosticMetadata] = None
    timestamp: str
