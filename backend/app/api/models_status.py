from datetime import datetime, timezone
from fastapi import APIRouter
from backend.app.services.ml.anti_spoof.adapter import anti_spoof_adapter
from backend.app.services.ml.speaker_verification.adapter import speaker_verification_adapter

router = APIRouter(prefix="/models", tags=["Machine Learning Registry & Telemetry"])


@router.get("/status")
def get_models_status():
    """
    Returns actual loaded status, versions, devices, and inference latencies.
    Follows zero-mock rule: strictly reports MODEL_NOT_CONFIGURED if weights are absent.
    """
    # Check GPU availability
    gpu_available = False
    gpu_device_name = None
    try:
        import torch
        gpu_available = torch.cuda.is_available()
        if gpu_available:
            gpu_device_name = torch.cuda.get_device_name(0)
    except ImportError:
        pass

    anti_spoof_info = anti_spoof_adapter.health_check()
    speaker_info = speaker_verification_adapter.health_check()

    return {
        "anti_spoof_model": anti_spoof_info,
        "speaker_verification_model": speaker_info,
        "device": "CUDA" if gpu_available else "CPU",
        "is_gpu_available": gpu_available,
        "gpu_device_name": gpu_device_name,
        "checked_at": datetime.now(timezone.utc),
    }
