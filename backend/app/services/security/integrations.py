from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseIntegrationProvider(ABC):
    """Abstract interface for external operational connectors."""

    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass


class BankingIntegrationProvider(BaseIntegrationProvider):
    """
    Safeguarded adapter for Core Banking, RTGS, or UPI payment gateways.
    Strictly reports NOT_CONFIGURED in hackathon and development modes.
    """

    def get_status(self) -> Dict[str, Any]:
        return {
            "integration": "CoreBankingGateway",
            "status": "NOT_CONFIGURED",
            "message": "External banking switch integration is intentionally disabled in SIH safe deployment mode.",
        }

    def place_transaction_hold(self, account_id: str, amount: float, reference_id: str) -> Dict[str, Any]:
        return {
            "status": "NOT_CONFIGURED",
            "error": "Cannot execute financial transaction hold: Gateway adapter is NOT_CONFIGURED.",
        }


class TelecomIntegrationProvider(BaseIntegrationProvider):
    """
    Safeguarded adapter for SS7/SIP telecommunication carrier metadata and call termination.
    Strictly reports NOT_CONFIGURED in safe deployment mode.
    """

    def get_status(self) -> Dict[str, Any]:
        return {
            "integration": "TelecomCarrierGateway",
            "status": "NOT_CONFIGURED",
            "message": "Telecom SS7/SIP carrier gateway is NOT_CONFIGURED.",
        }


class GovernmentIdentityProvider(BaseIntegrationProvider):
    """
    Safeguarded adapter for National ID / DigiLocker verification.
    Strictly reports NOT_CONFIGURED in safe deployment mode.
    """

    def get_status(self) -> Dict[str, Any]:
        return {
            "integration": "GovernmentIdentityGateway",
            "status": "NOT_CONFIGURED",
            "message": "Government ID provider interface is NOT_CONFIGURED.",
        }


banking_gateway = BankingIntegrationProvider()
telecom_gateway = TelecomIntegrationProvider()
gov_id_gateway = GovernmentIdentityProvider()
