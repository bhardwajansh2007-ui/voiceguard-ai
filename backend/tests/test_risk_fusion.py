from backend.app.services.risk.fusion_engine import RiskFusionEngine
from backend.app.schemas.analysis import AntiSpoofResult, SpeakerVerificationResult


def test_risk_fusion_low_risk():
    anti_spoof = AntiSpoofResult(
        status="GENUINE",
        spoof_probability=0.08,
        genuine_probability=0.92,
        confidence=0.84,
        model_version="test-v1",
    )
    speaker_res = SpeakerVerificationResult(
        status="MATCH",
        similarity=0.88,
        confidence=0.88,
        claimed_speaker_id="EMP-100",
    )

    score, level, signals, weights, factors = RiskFusionEngine.calculate_risk(
        anti_spoof=anti_spoof,
        speaker_res=speaker_res,
        behavioral_score=0.1,
        caller_risk=0.1,
        transaction_risk=0.1,
    )

    assert score < 30.0
    assert level == "LOW"
    assert "spoof_signal" in signals
    assert "speaker_mismatch_signal" in signals


def test_risk_fusion_high_synthetic_risk():
    anti_spoof = AntiSpoofResult(
        status="SPOOF",
        spoof_probability=0.94,
        genuine_probability=0.06,
        confidence=0.88,
        model_version="test-v1",
    )
    speaker_res = SpeakerVerificationResult(
        status="MISMATCH",
        similarity=0.12,
        confidence=0.88,
        claimed_speaker_id="EMP-100",
    )

    score, level, signals, weights, factors = RiskFusionEngine.calculate_risk(
        anti_spoof=anti_spoof,
        speaker_res=speaker_res,
        behavioral_score=0.6,
        caller_risk=0.7,
        transaction_risk=0.8,
    )

    assert score > 60.0
    assert level in ("HIGH", "CRITICAL")
    assert any("Synthetic speech" in f for f in factors)


def test_risk_fusion_unconfigured_model_handling():
    # If model is unconfigured, system must not fabricate spoof probability
    anti_spoof = AntiSpoofResult(
        status="MODEL_NOT_CONFIGURED",
        spoof_probability=None,
        genuine_probability=None,
        confidence=0.0,
        model_version="unconfigured",
    )
    speaker_res = SpeakerVerificationResult(
        status="SKIPPED",
        similarity=None,
        confidence=0.0,
        claimed_speaker_id=None,
    )

    score, level, signals, weights, factors = RiskFusionEngine.calculate_risk(
        anti_spoof=anti_spoof,
        speaker_res=speaker_res,
        behavioral_score=0.2,
        caller_risk=0.2,
        transaction_risk=0.2,
    )

    assert weights["weight_spoof"] == 0.0
    assert any("not configured" in f for f in factors)
    assert 0.0 <= score <= 100.0
