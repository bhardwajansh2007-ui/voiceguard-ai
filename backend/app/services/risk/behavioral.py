from typing import Tuple, List
from backend.app.schemas.analysis import AcousticFeatures


class BehavioralRiskEngine:
    """
    Evaluates prosodic, hesitation, and acoustic instability anomalies.
    Provides a contextual behavioral risk signal [0.0, 1.0].
    """

    @classmethod
    def evaluate(cls, features: AcousticFeatures) -> Tuple[float, List[str]]:
        """
        Calculates behavioral anomaly score based on jitter, shimmer,
        extreme pitch fluctuations, and unnatural pauses.
        """
        score = 0.0
        factors = []

        # 1. Extreme Jitter (Pitch period perturbation: normal speech is usually < 0.03)
        if features.jitter_local > 0.06:
            score += 0.25
            factors.append(f"Unnatural vocal pitch jitter detected ({features.jitter_local:.3f})")
        elif features.jitter_local > 0.035:
            score += 0.12
            factors.append("Slight vocal perturbation observed")

        # 2. Extreme Shimmer (Amplitude perturbation: normal speech is usually < 0.08)
        if features.shimmer_local > 0.15:
            score += 0.25
            factors.append(f"Atypical speech amplitude shimmer detected ({features.shimmer_local:.3f})")
        elif features.shimmer_local > 0.09:
            score += 0.10

        # 3. Speech vs Pause Ratio Anomaly
        if features.vad_speech_ratio < 0.25 and features.duration_seconds > 2.0:
            score += 0.20
            factors.append("Prolonged unnatural hesitation and silence gaps")
        elif features.vad_speech_ratio > 0.92 and features.duration_seconds > 3.0:
            score += 0.15
            factors.append("Continuous synthetic cadence without natural respiratory pauses")

        # 4. Fundamental Frequency (F0) Out-of-Bounds
        if features.fundamental_frequency_f0 > 380:
            score += 0.15
            factors.append("Artificially high pitch resonance")

        normalized_score = float(min(1.0, max(0.0, score)))
        return round(normalized_score, 4), factors


behavioral_engine = BehavioralRiskEngine()
