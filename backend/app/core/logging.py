import logging
import sys
from typing import Any, Dict
from pythonjsonlogger import jsonlogger
from backend.app.core.config import settings


class PrivacyAwareJsonFormatter(jsonlogger.JsonFormatter):
    """
    JSON log formatter that enforces privacy-by-design by filtering out
    passwords, tokens, raw audio, and sensitive PII from log output.
    """
    SENSITIVE_KEYS = {
        "password",
        "secret",
        "token",
        "authorization",
        "access_token",
        "raw_audio",
        "audio_bytes",
        "embedding",
    }

    def process_log_record(self, log_record: Dict[str, Any]) -> Dict[str, Any]:
        log_record["app"] = settings.APP_NAME
        log_record["env"] = settings.APP_ENV
        
        # Redact sensitive attributes
        for key in list(log_record.keys()):
            lower_key = key.lower()
            if any(s in lower_key for s in self.SENSITIVE_KEYS):
                log_record[key] = "[REDACTED_BY_POLICY]"

        return super().process_log_record(log_record)


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("voiceguard")
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(log_level)

    # Avoid duplicate handlers
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        formatter = PrivacyAwareJsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(module)s %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    return logger


logger = setup_logging()
