import numpy as np
from typing import Tuple, List


class VoiceActivityDetector:
    """
    Energy and spectral-entropy based Voice Activity Detector (VAD).
    Differentiates active human speech frames from acoustic silence and ambient line noise.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: float = 25.0,
        hop_duration_ms: float = 10.0,
        energy_threshold: float = 0.015,
    ):
        self.sample_rate = sample_rate
        self.frame_length = int(sample_rate * (frame_duration_ms / 1000.0))
        self.hop_length = int(sample_rate * (hop_duration_ms / 1000.0))
        self.energy_threshold = energy_threshold

    def process(self, audio: np.ndarray) -> Tuple[bool, float, np.ndarray]:
        """
        Analyzes audio array and returns:
        - is_active: bool (True if speech is detected)
        - speech_ratio: float (0.0 to 1.0, proportion of voiced frames)
        - voiced_mask: np.ndarray (Boolean mask of speech frames)
        """
        if len(audio) < self.frame_length:
            # Too short to process
            rms = np.sqrt(np.mean(audio ** 2)) if len(audio) > 0 else 0.0
            is_active = bool(rms > self.energy_threshold)
            return is_active, 1.0 if is_active else 0.0, np.array([is_active])

        # Frame audio
        num_frames = 1 + int((len(audio) - self.frame_length) / self.hop_length)
        voiced_frames = []

        for i in range(num_frames):
            start = i * self.hop_length
            end = start + self.frame_length
            frame = audio[start:end]

            # 1. Short-Time Energy (RMS)
            rms = np.sqrt(np.mean(frame ** 2))

            # 2. Zero-crossing rate
            zcr = np.mean(np.abs(np.diff(np.sign(frame)))) / 2.0

            # 3. Voiced classification logic (energy above threshold and reasonable ZCR for speech)
            is_speech = (rms > self.energy_threshold) and (0.01 <= zcr <= 0.65)
            voiced_frames.append(is_speech)

        voiced_mask = np.array(voiced_frames, dtype=bool)
        speech_ratio = float(np.mean(voiced_mask)) if len(voiced_mask) > 0 else 0.0
        is_active = speech_ratio > 0.15  # At least 15% voiced frames to consider as active speech

        return is_active, speech_ratio, voiced_mask


vad_detector = VoiceActivityDetector()
