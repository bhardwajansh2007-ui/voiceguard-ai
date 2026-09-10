from typing import Tuple, Dict, Any, List
from backend.app.schemas.security import SecurityDecisionResponse


class SecurityPolicyEngine:
    """
    Decoupled security policy enforcement layer.
    Translates risk scores and context constraints into actionable security decisions.
    """

    POLICY_VERSION = "v1.1.0"

    @classmethod
    def evaluate_policy(
        cls,
        risk_score: float,
        risk_level: str,
        action_type: str,
        action_sensitivity: str,
        transaction_amount: float = None,
        spoof_probability: float = None,
        contributing_factors: List[str] = None,
    ) -> Tuple[str, str, str]:
        """
        Determines:
        - decision: ALLOW, ADDITIONAL_VERIFICATION, STRONG_VERIFICATION, HOLD_SENSITIVE_ACTION
        - reason: Plaintext justification
        - required_action: Action required before release
        """
        factors_summary = "; ".join(contributing_factors) if contributing_factors else "Risk score within parameters"

        # Hard Rule 1: High synthetic probability triggers immediate hold
        if spoof_probability is not None and spoof_probability >= 0.80:
            return (
                "HOLD_SENSITIVE_ACTION",
                f"Synthetic voice detection probability exceeded security threshold ({spoof_probability*100:.1f}%). {factors_summary}",
                "INDEPENDENT_OUT_OF_BAND_VERIFICATION",
            )

        # Hard Rule 2: Critical action with moderate-to-high risk triggers immediate hold
        if (action_sensitivity == "CRITICAL" or (transaction_amount and transaction_amount > 250000)) and risk_score >= 35.0:
            return (
                "HOLD_SENSITIVE_ACTION",
                f"High-impact operation ({action_type}) coupled with elevated risk score ({risk_score}). {factors_summary}",
                "SUPERVISOR_DUAL_AUTHORIZATION",
            )

        # Tiered Level Policy
        if risk_level == "LOW":
            return (
                "ALLOW",
                f"All acoustic, speaker identity, and context metrics within low-risk tolerance. {factors_summary}",
                "NONE",
            )
        elif risk_level == "MEDIUM":
            return (
                "ADDITIONAL_VERIFICATION",
                f"Moderate impersonation risk detected. Secondary validation required. {factors_summary}",
                "MFA_CHALLENGE",
            )
        elif risk_level == "HIGH":
            return (
                "STRONG_VERIFICATION",
                f"Significant voice or context anomaly observed. Action restricted pending verification. {factors_summary}",
                "SUPERVISOR_CALLBACK",
            )
        else:  # CRITICAL
            return (
                "HOLD_SENSITIVE_ACTION",
                f"Critical impersonation risk. Transaction locked by automated defense policy. {factors_summary}",
                "INDEPENDENT_VERIFICATION",
            )


policy_engine = SecurityPolicyEngine()
