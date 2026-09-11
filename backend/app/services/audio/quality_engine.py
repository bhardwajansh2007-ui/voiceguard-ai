from dataclasses import dataclass
from typing import Optional, Dict, Any
import numpy as np


@dataclass
class AudioQualityReport:
    audio_quality: str
    quality_score: float
    duration_seconds: float
    rms_energy: float
    snr_estimate_db: float
    clipping_ratio: float
    silence_ratio: float
    vad_speech_ratio: float
    analysis_confidence: float
    uncertainty_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'audio_quality': self.audio_quality,
            'quality_score': round(self.quality_score, 2),
            'duration_seconds': round(self.duration_seconds, 3),
            'rms_energy': round(self.rms_energy, 4),
            'snr_estimate_db': round(self.snr_estimate_db, 2),
            'clipping_ratio': round(self.clipping_ratio, 4),
            'silence_ratio': round(self.silence_ratio, 4),
            'vad_speech_ratio': round(self.vad_speech_ratio, 3),
            'analysis_confidence': round(self.analysis_confidence, 4),
            'uncertainty_reason': self.uncertainty_reason,
        }


class AudioQualityEngine:
    MIN_DURATION_SECONDS = 1.0
    SILENCE_RMS_THRESHOLD = 1e-4

    @classmethod
    def analyze(
        cls,
        audio: np.ndarray,
        sample_rate: int = 16000,
        vad_ratio: float = 0.0,
        model_authenticity_score: Optional[float] = None,
    ) -> AudioQualityReport:
        duration = float(len(audio)) / float(sample_rate) if sample_rate > 0 else 0.0

        if len(audio) == 0:
            return AudioQualityReport(
                audio_quality='SILENCE',
                quality_score=0.0,
                duration_seconds=0.0,
                rms_energy=0.0,
                snr_estimate_db=0.0,
                clipping_ratio=0.0,
                silence_ratio=1.0,
                vad_speech_ratio=0.0,
                analysis_confidence=0.0,
                uncertainty_reason='Empty audio buffer received',
            )

        rms = float(np.sqrt(np.mean(audio ** 2)))
        if rms < cls.SILENCE_RMS_THRESHOLD:
            return AudioQualityReport(
                audio_quality='SILENCE',
                quality_score=0.0,
                duration_seconds=duration,
                rms_energy=rms,
                snr_estimate_db=0.0,
                clipping_ratio=0.0,
                silence_ratio=1.0,
                vad_speech_ratio=0.0,
                analysis_confidence=0.0,
                uncertainty_reason='Signal amplitude is below audible threshold (pure digital silence)',
            )

        if duration < cls.MIN_DURATION_SECONDS:
            return AudioQualityReport(
                audio_quality='INSUFFICIENT_AUDIO',
                quality_score=20.0,
                duration_seconds=duration,
                rms_energy=rms,
                snr_estimate_db=0.0,
                clipping_ratio=0.0,
                silence_ratio=0.0,
                vad_speech_ratio=vad_ratio,
                analysis_confidence=0.1,
                uncertainty_reason=f'Audio duration ({duration:.2f}s) is below the minimum 1.0s required for neural topology',
            )

        clipping_samples = np.sum(np.abs(audio) >= 0.99)
        clipping_ratio = float(clipping_samples) / float(len(audio))

        frame_size = int(sample_rate * 0.02)
        frames = [float(np.mean(audio[i : i + frame_size] ** 2)) for i in range(0, len(audio) - frame_size, frame_size)]
        if frames:
            noise_floor = float(np.percentile(frames, 10))
            silence_frames = sum(1 for f in frames if f < 1e-4)
            silence_ratio = float(silence_frames) / float(len(frames))
            speech_frames = [f for f in frames if f > noise_floor * 2.0]
            speech_pwr = float(np.mean(speech_frames)) if speech_frames else float(np.mean(frames))
            snr_db = float(10.0 * np.log10(max(speech_pwr, 1e-8) / max(noise_floor, 1e-8)))
        else:
            silence_ratio = 0.0
            snr_db = 20.0

        snr_factor = np.clip(snr_db / 40.0, 0.0, 1.0) * 50.0
        rms_factor = 25.0 if (0.01 <= rms <= 0.5) else 10.0
        clipping_penalty = min(25.0, clipping_ratio * 500.0)
        silence_penalty = min(20.0, silence_ratio * 30.0)

        quality_score = float(np.clip(snr_factor + rms_factor + 25.0 - clipping_penalty - silence_penalty, 0.0, 100.0))

        uncertainty_reason = None
        is_boundary_uncertain = False
        if model_authenticity_score is not None:
            boundary_margin = abs(model_authenticity_score - 0.50)
            if boundary_margin < 0.15:
                is_boundary_uncertain = True
                uncertainty_reason = f'Model authenticity score ({model_authenticity_score:.2f}) is near the ambiguous boundary [0.35 - 0.65]'
        else:
            boundary_margin = 0.0

        if clipping_ratio > 0.05:
            quality_label = 'SEVERE_CLIPPING'
            uncertainty_reason = 'Severe audio clipping detected (waveform peak saturation)'
        elif snr_db < 10.0 or quality_score < 40.0:
            quality_label = 'LOW_AUDIO_QUALITY'
            if not uncertainty_reason:
                uncertainty_reason = f'High background noise or low SNR ({snr_db:.1f} dB)'
        elif is_boundary_uncertain:
            quality_label = 'MODEL_UNCERTAIN'
        else:
            quality_label = 'GOOD_AUDIO'

        base_confidence = quality_score / 100.0
        if model_authenticity_score is not None:
            confidence = float(np.clip(base_confidence * (min(1.0, boundary_margin * 2.5)), 0.1, 1.0))
        else:
            confidence = float(base_confidence * 0.5)

        return AudioQualityReport(
            audio_quality=quality_label,
            quality_score=quality_score,
            duration_seconds=duration,
            rms_energy=rms,
            snr_estimate_db=snr_db,
            clipping_ratio=clipping_ratio,
            silence_ratio=silence_ratio,
            vad_speech_ratio=vad_ratio,
            analysis_confidence=confidence,
            uncertainty_reason=uncertainty_reason,
        )


quality_engine = AudioQualityEngine()