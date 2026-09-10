from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import numpy as np
from backend.app.schemas.analysis import SpeakerVerificationResult


class BaseSpeakerVerificationModel(ABC):
    """Abstract interface for Speaker Representation & Verification models."""

    @abstractmethod
    def compute_embedding(self, audio: np.ndarray, sample_rate: int = 16000) -> List[float]:
        """Extracts fixed-dimension acoustic speaker embedding vector."""
        pass

    @abstractmethod
    def verify_similarity(self, embedding_a: List[float], embedding_b: List[float]) -> float:
        """Computes cosine similarity between two speaker embeddings [-1.0 to 1.0]."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Returns model status, dimension, and device info."""
        pass
