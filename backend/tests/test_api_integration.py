import io
import wave
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def get_auth_token():
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "VoiceGuardAdmin2026!"},
    )
    return login_res.json()["access_token"]


def make_test_wav(duration=1.0, freq=350.0):
    t = np.linspace(0, duration, int(16000 * duration), endpoint=False)
    signal = (0.6 * np.sin(2 * np.pi * freq * t) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(signal.tobytes())
    return buf.getvalue()


def test_full_call_analysis_lifecycle():
    import uuid
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    test_call_id = f"CALL-{uuid.uuid4().hex[:8].upper()}"

    # 1. Initialize Call Session
    call_payload = {
        "call_id": test_call_id,
        "caller_id": "+919988776655",
        "claimed_identity": None,
        "action_type": "WIRE_TRANSFER",
        "action_sensitivity": "CRITICAL",
        "transaction_amount": 550000.0,
        "authentication_state": "UNAUTHENTICATED",
    }
    create_res = client.post("/api/v1/calls", json=call_payload, headers=headers)
    assert create_res.status_code == 201
    call_data = create_res.json()
    assert call_data["call_id"] == test_call_id

    # 2. Upload Audio for Analysis
    wav_bytes = make_test_wav(1.5)
    upload_res = client.post(
        f"/api/v1/calls/{test_call_id}/audio",
        files={"file": ("test_speech.wav", wav_bytes, "audio/wav")},
        headers=headers,
    )
    assert upload_res.status_code == 200
    analysis_data = upload_res.json()
    assert "risk_assessment" in analysis_data
    assert "security_decision" in analysis_data
    assert analysis_data["security_decision"]["decision"] == "HOLD_SENSITIVE_ACTION"

    # 3. Verify Call Details in REST API
    detail_res = client.get(f"/api/v1/calls/{test_call_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "HOLD"
    assert detail["latest_analysis"] is not None

    # 4. Resolve Decision by Security Analyst
    resolve_res = client.post(
        f"/api/v1/security/decisions/{test_call_id}/resolve",
        json={"action_status": "RESOLVED_ALLOW", "analyst_notes": "Verified via supervisor direct callback."},
        headers=headers,
    )
    assert resolve_res.status_code == 200
    resolved = resolve_res.json()
    assert resolved["action_status"] == "RESOLVED_ALLOW"

    # 5. Check Audit Trail
    audit_res = client.get(f"/api/v1/audit/call/{test_call_id}", headers=headers)
    assert audit_res.status_code == 200
    trail = audit_res.json()
    assert len(trail) >= 3  # CALL_STARTED, ANALYSIS_COMPLETED, SECURITY_HOLD_TRIGGERED, ACTION_RESOLVED
