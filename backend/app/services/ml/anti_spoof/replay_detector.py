from dataclasses import dataclass
from typing import Dict, Any, Optional
import numpy as np


@dataclass
class ReplayAnalysisResult:
    replay_likelihood: float
    replay_confidence: float
    status: str
    comb_filtering_score: float
    reverberation_tail_energy: float
    high_freq_distortion_ratio: float
    validation_status: str = 'LIMITED / NOT FORMALLY VALIDATED ON ASVspoof PA'

    def to_dict(self) -> Dict[str, Any]:
        return {
            'replay_likelihood': round(self.replay_likelihood, 4),
            'replay_confidence': round(self.replay_confidence, 4),
            'status': self.status,
            'comb_filtering_score': round(self.comb_filtering_score, 4),
            'reverberation_tail_energy': round(self.reverberation_tail_energy, 4),
            'high_freq_distortion_ratio': round(self.high_freq_distortion_ratio, 4),
            'validation_status': self.validation_status,
        }


class ReplayAnomalyDetector:
    @classmethod
    def analyze(cls, audio: np.ndarray, sample_rate: int = 16000) -> ReplayAnalysisResult:
        if len(audio) < 1600:
            return ReplayAnalysisResult(
                replay_likelihood=0.0,
                replay_confidence=0.0,
                status='LIMITED',
                comb_filtering_score=0.0,
                reverberation_tail_energy=0.0,
                high_freq_distortion_ratio=0.0,
            )

        n_fft = 1024
        hop = 512
        num_frames = max(1, 1 + int((len(audio) - n_fft) / hop))
        window = np.hanning(n_fft)

        frame_mags = []
        for i in range(num_frames):
            frame = audio[i * hop : i * hop + n_fft]
            if len(frame) < n_fft:
                frame = np.pad(frame, (0, n_fft - len(frame)))
            frame_mags.append(np.abs(np.fft.rfft(frame * window)))

        avg_mag = np.mean(frame_mags, axis=0) if frame_mags else np.zeros(n_fft // 2 + 1)
        freqs = np.fft.rfftfreq(n_fft, 1.0 / sample_rate)

        log_spec = np.log(np.maximum(avg_mag, 1e-8))
        diff2 = np.diff(log_spec, n=2)
        comb_score = float(np.clip(np.std(diff2) / 0.5, 0.0, 1.0))

        frame_energies = [float(np.mean(m ** 2)) for m in frame_mags]
        if frame_energies:
            p10 = float(np.percentile(frame_energies, 10))
            p90 = float(np.percentile(frame_energies, 90))
            reverb_tail = float(np.clip(p10 / (p90 + 1e-8) * 10.0, 0.0, 1.0))
        else:
            reverb_tail = 0.0

        high_band = avg_mag[freqs >= 4000]
        mid_band = avg_mag[(freqs >= 1000) & (freqs < 4000)]
        hf_ratio = float(np.sum(high_band) / (np.sum(mid_band) + 1e-8))
        hf_anomaly = float(np.clip(abs(hf_ratio - 0.25) / 0.25, 0.0, 1.0))

        replay_likelihood = float(np.clip(
            0.40 * comb_score + 0.35 * reverb_tail + 0.25 * hf_anomaly,
            0.0,
            1.0
        ))

        replay_confidence = float(np.clip(0.65 * abs(replay_likelihood - 0.5) * 2.0, 0.1, 0.65))

        if replay_likelihood > 0.65:
            status = 'SUSPECTED_REPLAY'
        elif replay_likelihood < 0.35:
            status = 'LIKELY_DIRECT'
        else:
            status = 'UNCERTAIN'

        return ReplayAnalysisResult(
            replay_likelihood=replay_likelihood,
            replay_confidence=replay_confidence,
            status=status,
            comb_filtering_score=comb_score,
            reverberation_tail_energy=reverb_tail,
            high_freq_distortion_ratio=hf_anomaly,
        )


replay_detector = ReplayAnomalyDetector()