import os
import time
from typing import Dict, Any, Optional
import numpy as np

from backend.app.services.ml.anti_spoof.base import BaseAntiSpoofModel
from backend.app.schemas.analysis import AntiSpoofResult
from backend.app.core.config import settings
from backend.app.core.logging import logger


class AntiSpoofAdapter(BaseAntiSpoofModel):
    """
    Production adapter for Voice Anti-Spoofing.
    Loads AASIST or Torch/ONNX acoustic anti-spoof model when checkpoints are configured.
    Strictly reports MODEL_NOT_CONFIGURED when weights are missing, never inventing predictions.
    """

    def __init__(self):
        self.model_path = settings.ANTI_SPOOF_MODEL_PATH
        self.device = settings.DEVICE
        self.model_version = "AASIST-v2.1"
        self.is_loaded = False
        self.model = None
        self.last_inference_latency_ms: Optional[float] = None
        self.load_model()

    def load_model(self) -> bool:
        if not self.model_path or not os.path.exists(self.model_path):
            logger.info(
                f"No anti-spoof checkpoint configured at '{self.model_path}'. "
                f"Adapter initialized in unconfigured state (reporting MODEL_NOT_CONFIGURED)."
            )
            self.is_loaded = False
            return False

        try:
            logger.info(f"Loading anti-spoof checkpoint from {self.model_path} on {self.device}...")
            # If a PyTorch or ONNX checkpoint exists, load weights here
            import torch
            self.model = torch.load(self.model_path, map_location=self.device)
            self.model.eval()
            self.is_loaded = True
            logger.info("Anti-spoof model successfully loaded into memory.")
            return True
        except Exception as e:
            logger.error(f"Failed to load anti-spoof checkpoint: {str(e)}")
            self.is_loaded = False
            return False

    def predict(self, audio: np.ndarray, sample_rate: int = 16000) -> AntiSpoofResult:
        """
        Executes genuine vs synthetic classification.
        If model is not configured, returns MODEL_NOT_CONFIGURED honestly without faking values.
        """
        if not self.is_loaded or self.model is None:
            return AntiSpoofResult(
                status="MODEL_NOT_CONFIGURED",
                spoof_probability=None,
                genuine_probability=None,
                confidence=0.0,
                model_version=f"{self.model_version}-unconfigured",
            )

        start_time = time.perf_counter()
        try:
            import torch
            with torch.no_grad():
                tensor_input = torch.from_numpy(audio).unsqueeze(0).to(self.device)
                outputs = self.model(tensor_input)
                probs = torch.softmax(outputs, dim=-1).cpu().numpy()[0]
                
                # AASIST convention: index 0 = spoof, index 1 = bonafide/genuine
                spoof_prob = float(probs[0])
                genuine_prob = float(probs[1])
                confidence = float(abs(spoof_prob - genuine_prob))
                
                status_label = "SPOOF" if spoof_prob >= 0.5 else "GENUINE"
                self.last_inference_latency_ms = (time.perf_counter() - start_time) * 1000.0

                return AntiSpoofResult(
                    status=status_label,
                    spoof_probability=round(spoof_prob, 4),
                    genuine_probability=round(genuine_prob, 4),
                    confidence=round(confidence, 4),
                    model_version=self.model_version,
                )
        except Exception as e:
            logger.error(f"Inference execution failed: {str(e)}")
            return AntiSpoofResult(
                status="MODEL_ERROR",
                spoof_probability=None,
                genuine_probability=None,
                confidence=0.0,
                model_version=self.model_version,
            )

    def health_check(self) -> Dict[str, Any]:
        return {
            "model_name": "VoiceAntiSpoof-AASIST",
            "model_version": self.model_version,
            "status": "LOADED" if self.is_loaded else "MODEL_NOT_CONFIGURED",
            "is_loaded": self.is_loaded,
            "device": self.device,
            "configured_path": self.model_path or "None",
            "last_latency_ms": round(self.last_inference_latency_ms, 2) if self.last_inference_latency_ms else None,
        }


anti_spoof_adapter = AntiSpoofAdapter()
