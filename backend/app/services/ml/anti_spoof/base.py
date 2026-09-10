from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import numpy as np
from backend.app.schemas.analysis import AntiSpoofResult


class BaseAntiSpoofModel(ABC):
    """
    Standard interface for Voice Anti-Spoofing and Deepfake Detection models.
    Supports AASIST, RawNet2, WavLM, or acoustic anomaly architectures.
    """

    @abstractmethod
    def load_model(self) -> bool:
        """Loads model weights into memory/device. Returns True if successfully loaded."""
        pass

    @abstractmethod
    def predict(self, audio: np.ndarray, sample_rate: int = 16000) -> AntiSpoofResult:
        """
        Infers authenticity of audio array.
        Returns AntiSpoofResult with spoof_probability, genuine_probability, and confidence.
        """
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Returns status, device, model_version, and operational metrics."""
        pass
