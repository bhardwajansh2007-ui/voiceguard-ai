from typing import Tuple, List, Optional
from backend.app.models.database_models import CallSession


class ContextRiskEngine:
    """
    Evaluates caller identity metadata, requested action sensitivity,
    transaction values, and current authentication state.
    """

    ACTION_SENSITIVITIES = {
        "GENERAL_INQUIRY": 0.05,
        "ACCOUNT_STATUS": 0.15,
        "PASSWORD_RESET": 0.60,
        "CREDENTIAL_RESET": 0.70,
        "DATA_ACCESS": 0.75,
        "WIRE_TRANSFER": 0.85,
        "HIGH_VALUE_DISBURSEMENT": 0.95,
        "SYSTEM_CONFIG": 0.90,
    }

    @classmethod
    def evaluate(
        cls,
        action_type: str,
        action_sensitivity: str,
        transaction_amount: Optional[float] = None,
        caller_id: Optional[str] = None,
        authentication_state: str = "UNAUTHENTICATED",
    ) -> Tuple[float, float, List[str]]:
        """
        Returns:
        - caller_risk: float [0.0, 1.0]
        - transaction_risk: float [0.0, 1.0]
        - factors: List[str]
        """
        factors = []
        caller_risk = 0.1
        transaction_risk = 0.1

        # 1. Caller Risk Assessment
        if not caller_id or caller_id.lower() in ("unknown", "anonymous", "private", ""):
            caller_risk += 0.40
            factors.append("Call originated from an anonymous or masked caller ID")
        
        if authentication_state == "UNAUTHENTICATED":
            caller_risk += 0.35
            factors.append("Caller is completely unauthenticated")
        elif authentication_state == "PARTIALLY_AUTHENTICATED":
            caller_risk += 0.15

        caller_risk = min(1.0, max(0.0, caller_risk))

        # 2. Transaction / Action Risk Assessment
        base_action_risk = cls.ACTION_SENSITIVITIES.get(action_type.upper(), 0.30)
        
        sensitivity_multiplier = {
            "LOW": 0.5,
            "MEDIUM": 0.8,
            "HIGH": 1.1,
            "CRITICAL": 1.3,
        }.get(action_sensitivity.upper(), 1.0)

        transaction_risk = base_action_risk * sensitivity_multiplier

        # Check financial amount threshold
        if transaction_amount is not None:
            if transaction_amount > 500000:
                transaction_risk += 0.40
                factors.append(f"High-value financial operation requested (Amount: {transaction_amount:,.2f})")
            elif transaction_amount > 50000:
                transaction_risk += 0.20
                factors.append(f"Substantial financial operation requested (Amount: {transaction_amount:,.2f})")
            elif transaction_amount > 5000:
                transaction_risk += 0.10

        if action_type.upper() in ("WIRE_TRANSFER", "HIGH_VALUE_DISBURSEMENT", "CREDENTIAL_RESET"):
            factors.append(f"High-impact sensitive action requested: {action_type}")

        transaction_risk = min(1.0, max(0.0, transaction_risk))

        return round(caller_risk, 4), round(transaction_risk, 4), factors


context_risk_engine = ContextRiskEngine()
