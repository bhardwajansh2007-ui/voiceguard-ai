import json
from typing import Dict, Any, List, Tuple, Optional
from backend.app.core.config import settings
from backend.app.schemas.analysis import AntiSpoofResult, SpeakerVerificationResult


class RiskFusionEngine:
    """
    Synthesizes independent security dimensions into a transparent, explainable,
    and reproducible impersonation risk score (0 - 100).
    """

    VERSION = "v1.2.0"

    @classmethod
    def calculate_risk(
        cls,
        anti_spoof: AntiSpoofResult,
        speaker_res: SpeakerVerificationResult,
        behavioral_score: float,
        caller_risk: float,
        transaction_risk: float,
        custom_weights: Optional[Dict[str, float]] = None,
        custom_thresholds: Optional[Dict[str, float]] = None,
    ) -> Tuple[float, str, Dict[str, float], Dict[str, float], List[str]]:
        """
        Calculates:
        - overall_score (0.0 to 100.0)
        - risk_level (LOW, MEDIUM, HIGH, CRITICAL)
        - signal_values (dict of 0.0 - 1.0)
        - weights_used (dict)
        - contributing_factors (list of explanations)
        """
        factors: List[str] = []
        signals: Dict[str, float] = {}

        # 1. Anti-Spoof Signal
        if anti_spoof.status == "MODEL_NOT_CONFIGURED" or anti_spoof.spoof_probability is None:
            spoof_signal = 0.0
            spoof_available = False
            factors.append("Anti-spoof model not configured; acoustic model prediction omitted")
        else:
            spoof_signal = anti_spoof.spoof_probability
            spoof_available = True
            if spoof_signal > 0.65:
                factors.append(f"Synthetic speech probability elevated ({spoof_signal * 100:.1f}%)")
            elif spoof_signal > 0.40:
                factors.append(f"Uncertain voice authenticity indicator ({spoof_signal * 100:.1f}%)")

        signals["spoof_signal"] = round(spoof_signal, 4)

        # 2. Speaker Verification Signal
        if speaker_res.status == "NO_ENROLLMENT_FOUND":
            speaker_mismatch_signal = 0.50
            factors.append("Claimed identity has no enrolled biometric voice profile")
        elif speaker_res.status == "SKIPPED":
            speaker_mismatch_signal = 0.20
        elif speaker_res.similarity is not None:
            # Cosine similarity is [-1, 1]. Invert and scale to [0, 1] mismatch
            similarity_clamped = max(-1.0, min(1.0, speaker_res.similarity))
            # similarity = 1.0 -> mismatch = 0.0; similarity = 0.0 -> mismatch = 0.5; similarity = -1.0 -> mismatch = 1.0
            speaker_mismatch_signal = (1.0 - similarity_clamped) / 2.0
            if speaker_res.similarity < 0.45:
                factors.append(
                    f"Acoustic mismatch with claimed speaker (Similarity: {speaker_res.similarity:.2f})"
                )
        else:
            speaker_mismatch_signal = 0.30

        signals["speaker_mismatch_signal"] = round(speaker_mismatch_signal, 4)

        # 3. Behavioral Risk Signal
        signals["behavioral_signal"] = round(behavioral_score, 4)
        if behavioral_score > 0.50:
            factors.append(f"Behavioral & prosodic anomaly score elevated ({behavioral_score * 100:.1f}%)")

        # 4. Caller Context Signal
        signals["caller_context_signal"] = round(caller_risk, 4)
        if caller_risk > 0.60:
            factors.append("Caller identity risk elevated (unauthenticated or unverified caller)")

        # 5. Transaction Sensitivity Signal
        signals["transaction_sensitivity_signal"] = round(transaction_risk, 4)
        if transaction_risk > 0.65:
            factors.append("High transaction sensitivity and operational impact")

        # Compute Weights
        weights = custom_weights or {
            "weight_spoof": settings.WEIGHT_SPOOF,
            "weight_speaker_mismatch": settings.WEIGHT_SPEAKER_MISMATCH,
            "weight_behavioral": settings.WEIGHT_BEHAVIORAL,
            "weight_caller_context": settings.WEIGHT_CALLER_CONTEXT,
            "weight_transaction_sensitivity": settings.WEIGHT_TRANSACTION_SENSITIVITY,
        }

        # If anti-spoof model is not configured, re-normalize remaining weights
        active_weights = dict(weights)
        if not spoof_available:
            active_weights["weight_spoof"] = 0.0
            total_remaining = sum(active_weights.values())
            if total_remaining > 0:
                for k in active_weights:
                    active_weights[k] = active_weights[k] / total_remaining

        # Weighted Sum
        raw_weighted_risk = (
            signals["spoof_signal"] * active_weights["weight_spoof"]
            + signals["speaker_mismatch_signal"] * active_weights["weight_speaker_mismatch"]
            + signals["behavioral_signal"] * active_weights["weight_behavioral"]
            + signals["caller_context_signal"] * active_weights["weight_caller_context"]
            + signals["transaction_sensitivity_signal"] * active_weights["weight_transaction_sensitivity"]
        )

        overall_score = round(float(raw_weighted_risk * 100.0), 2)
        overall_score = max(0.0, min(100.0, overall_score))

        # Classify Risk Level
        th = custom_thresholds or {
            "low": settings.RISK_THRESHOLD_LOW,
            "medium": settings.RISK_THRESHOLD_MEDIUM,
            "high": settings.RISK_THRESHOLD_HIGH,
        }

        if overall_score <= th["low"]:
            risk_level = "LOW"
        elif overall_score <= th["medium"]:
            risk_level = "MEDIUM"
        elif overall_score <= th["high"]:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        return (
            overall_score,
            risk_level,
            signals,
            {k: round(v, 4) for k, v in active_weights.items()},
            factors,
        )


risk_fusion_engine = RiskFusionEngine()
