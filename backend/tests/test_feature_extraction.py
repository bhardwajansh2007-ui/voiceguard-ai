import numpy as np
from backend.app.services.ml.feature_extraction.acoustic import AcousticFeatureExtractor


def test_acoustic_feature_extractor_outputs():
    extractor = AcousticFeatureExtractor(sample_rate=16000, n_mfcc=13)

    # 1.5s harmonic audio with 200 Hz pitch
    t = np.linspace(0, 1.5, int(16000 * 1.5), endpoint=False)
    signal = (
        0.5 * np.sin(2 * np.pi * 200.0 * t)
        + 0.25 * np.sin(2 * np.pi * 400.0 * t)
        + 0.1 * np.sin(2 * np.pi * 600.0 * t)
    ).astype(np.float32)

    features = extractor.extract_features(signal, vad_speech_ratio=0.85)

    assert features.duration_seconds == 1.5
    assert features.sample_rate == 16000
    assert features.vad_speech_ratio == 0.85
    assert features.rms_energy > 0.1
    assert features.spectral_centroid > 100.0
    assert features.spectral_bandwidth > 50.0
    assert features.zero_crossing_rate > 0.0
    assert len(features.mfcc_mean) == 13
    assert 180.0 <= features.fundamental_frequency_f0 <= 220.0
