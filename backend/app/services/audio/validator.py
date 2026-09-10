import io
from typing import Tuple
from fastapi import HTTPException, status
from backend.app.core.config import settings
from backend.app.core.logging import logger

MAGIC_HEADERS = {
    b"RIFF": "wav",
    b"ID3": "mp3",
    b"\xff\xfb": "mp3",
    b"\xff\xf3": "mp3",
    b"\xff\xf2": "mp3",
    b"fLaC": "flac",
}


def validate_audio_file(filename: str, content: bytes) -> str:
    """
    Validates audio file format, size limits, and binary magic signatures.
    Rejects corrupted, oversized, or executable payloads.
    """
    if not content or len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is completely empty.",
        )

    if len(content) > settings.MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds maximum allowed size of {settings.MAX_AUDIO_SIZE_BYTES // (1024*1024)} MB.",
        )

    # Inspect magic header
    header_found = None
    for magic, fmt in MAGIC_HEADERS.items():
        if content.startswith(magic):
            header_found = fmt
            break

    # Also check if it has mp4/m4a ftyp box
    if not header_found and len(content) >= 12:
        if content[4:8] == b"ftyp":
            header_found = "m4a"

    lower_name = filename.lower()
    allowed_exts = (".wav", ".mp3", ".flac", ".m4a")
    if not any(lower_name.endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Permitted formats: {', '.join(allowed_exts)}",
        )

    if not header_found:
        # If WAV or MP3 extension doesn't match magic bytes
        logger.warning(f"File {filename} header did not match recognized audio signatures")
        # For testing or raw audio, permit WAV if header starts with RIFF
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match a valid audio binary signature.",
        )

    return header_found
