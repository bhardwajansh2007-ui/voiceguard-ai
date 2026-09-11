import io
import wave
import numpy as np
import torch
from typing import Tuple, Optional
from fastapi import HTTPException, status
from backend.app.core.config import settings
from backend.app.core.logging import logger


class AudioPreprocessor:
    """
    Standardizes all inbound audio to 16,000 Hz, single-channel (mono),
    32-bit floating point range [-1.0, 1.0].
    """

    TARGET_SAMPLE_RATE = settings.AUDIO_SAMPLE_RATE

    @classmethod
    def load_wav_bytes(cls, audio_bytes: bytes) -> Tuple[np.ndarray, int]:
        """Loads and parses WAV audio bytes safely into a numpy array."""
        try:
            with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                framerate = wf.getframerate()
                n_frames = wf.getnframes()
                raw_data = wf.readframes(n_frames)

                if sampwidth == 1:
                    dtype = np.uint8
                elif sampwidth == 2:
                    dtype = np.int16
                elif sampwidth == 4:
                    dtype = np.int32
                else:
                    raise ValueError(f"Unsupported sample width: {sampwidth}")

                audio_arr = np.frombuffer(raw_data, dtype=dtype)
                if n_channels > 1:
                    audio_arr = audio_arr.reshape(-1, n_channels)
                return audio_arr, framerate
        except Exception as e:
            logger.error(f"Failed to decode audio: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to decode audio stream: Corrupted or unreadable format."
            )

    @classmethod
    def normalize_audio(cls, audio_data: np.ndarray, orig_sr: int) -> Tuple[np.ndarray, float]:
        """
        Converts to mono, resamples to 16kHz, and normalizes to float32 [-1.0, 1.0].
        Returns (processed_audio, duration_seconds).
        """
        # 1. Convert to float32
        if audio_data.dtype == np.int16:
            audio = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio = audio_data.astype(np.float32) / 2147483648.0
        elif audio_data.dtype == np.uint8:
            audio = (audio_data.astype(np.float32) - 128.0) / 128.0
        elif np.issubdtype(audio_data.dtype, np.floating):
            audio = audio_data.astype(np.float32)
        else:
            audio = audio_data.astype(np.float32)

        # 2. Multi-channel to mono
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        # 3. Handle silence or empty array
        if len(audio) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio stream contains zero samples.",
            )

        # 4. Resample to TARGET_SAMPLE_RATE if needed
        if orig_sr != cls.TARGET_SAMPLE_RATE:
            try:
                import torchaudio.functional as F
                tensor_audio = torch.from_numpy(audio)
                resampled = F.resample(tensor_audio, orig_sr, cls.TARGET_SAMPLE_RATE)
                audio = resampled.numpy().astype(np.float32)
            except Exception:
                target_length = int(len(audio) * cls.TARGET_SAMPLE_RATE / orig_sr)
                try:
                    from scipy import signal
                    audio = signal.resample(audio, target_length).astype(np.float32)
                except Exception:
                    indices = np.linspace(0, len(audio) - 1, target_length)
                    audio = np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)

        # 5. Amplitude normalization (peak scale if audio is non-silent)
        peak = np.max(np.abs(audio))
        if peak > 1.0:
            audio = audio / peak
        elif peak > 0.001:
            # Normalize to standard headroom without over-amplifying noise floor
            audio = audio / max(peak, 0.2) * 0.9

        duration_seconds = float(len(audio)) / float(cls.TARGET_SAMPLE_RATE)
        return audio, duration_seconds

    @classmethod
    def decode_raw_pcm_chunk(cls, pcm_bytes: bytes) -> np.ndarray:
        """Decodes raw 16-bit PCM streaming chunk into normalized float32 array."""
        audio_int16 = np.frombuffer(pcm_bytes, dtype=np.int16)
        audio_float = audio_int16.astype(np.float32) / 32768.0
        return audio_float
