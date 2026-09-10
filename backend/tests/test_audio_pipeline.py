import io
import wave
import pytest
import numpy as np
from fastapi import HTTPException
from backend.app.services.audio.validator import validate_audio_file
from backend.app.services.audio.preprocessor import AudioPreprocessor
from backend.app.services.audio.vad import VoiceActivityDetector


def generate_wav_bytes(duration_sec=1.0, sample_rate=16000, freq=440.0) -> bytes:
    """Generates synthetic in-memory WAV audio bytes."""
    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    # Sine wave
    signal = 0.5 * np.sin(2 * np.pi * freq * t)
    int16_data = (signal * 32767).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int16_data.tobytes())
    return buffer.getvalue()


def test_audio_validator_valid_wav():
    wav_bytes = generate_wav_bytes(0.5)
    fmt = validate_audio_file("sample.wav", wav_bytes)
    assert fmt == "wav"


def test_audio_validator_rejects_empty():
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file("empty.wav", b"")
    assert exc_info.value.status_code == 400


def test_audio_validator_rejects_invalid_bytes():
    with pytest.raises(HTTPException) as exc_info:
        validate_audio_file("fake.wav", b"NOT_A_REAL_WAV_FILE_HEADER")
    assert exc_info.value.status_code == 400


def test_audio_preprocessor_normalization():
    wav_bytes = generate_wav_bytes(1.5, sample_rate=8000, freq=220.0)
    raw_audio, orig_sr = AudioPreprocessor.load_wav_bytes(wav_bytes)
    assert orig_sr == 8000

    audio_norm, duration = AudioPreprocessor.normalize_audio(raw_audio, orig_sr)
    assert np.issubdtype(audio_norm.dtype, np.floating)
    assert len(audio_norm) == int(1.5 * 16000)  # Resampled to 16kHz
    assert round(duration, 1) == 1.5
    assert np.max(np.abs(audio_norm)) <= 1.0


def test_vad_detects_speech_vs_silence():
    vad = VoiceActivityDetector(sample_rate=16000)
    
    # 1. Pure silence
    silence = np.zeros(16000, dtype=np.float32)
    is_active, ratio, _ = vad.process(silence)
    assert is_active is False
    assert ratio == 0.0

    # 2. Strong audio tone
    tone_bytes = generate_wav_bytes(1.0, freq=300.0)
    raw_audio, sr = AudioPreprocessor.load_wav_bytes(tone_bytes)
    audio_norm, _ = AudioPreprocessor.normalize_audio(raw_audio, sr)
    is_active, ratio, _ = vad.process(audio_norm)
    assert is_active is True
    assert ratio > 0.5
