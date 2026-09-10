import io
import wave
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_websocket_streaming_pipeline():
    import uuid
    ws_call_id = f"WS-CALL-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create Call Session first
    call_res = client.post(
        "/api/v1/calls",
        json={"call_id": ws_call_id, "action_type": "GENERAL_INQUIRY", "action_sensitivity": "LOW"},
        headers={"Authorization": f"Bearer {client.post('/api/v1/auth/login', data={'username': 'admin', 'password': 'VoiceGuardAdmin2026!'}).json()['access_token']}"},
    )
    assert call_res.status_code == 201

    # 2. Connect WebSocket and stream synthetic 16kHz PCM chunks
    with client.websocket_connect(f"/ws/calls/{ws_call_id}/stream") as websocket:
        # Initial greeting
        ready_msg = websocket.receive_json()
        assert ready_msg["type"] == "STREAM_READY"

        # Generate 2.5 seconds of 16kHz 16-bit PCM audio
        duration = 2.6
        sample_rate = 16000
        t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
        pcm_signal = (0.5 * np.sin(2 * np.pi * 300.0 * t) * 32767).astype(np.int16)
        raw_bytes = pcm_signal.tobytes()

        # Send in 0.5s packets (8000 samples * 2 bytes = 16000 bytes each)
        chunk_bytes = 16000
        for i in range(0, len(raw_bytes), chunk_bytes):
            websocket.send_bytes(raw_bytes[i : i + chunk_bytes])

        # Receive analysis update once 2.5s window buffer is fulfilled (skip intermediate BUFFER_STATUS)
        update_msg = None
        for _ in range(20):
            msg = websocket.receive_json()
            if msg.get("type") == "ANALYSIS_UPDATE":
                update_msg = msg
                break
        assert update_msg is not None
        assert update_msg["type"] == "ANALYSIS_UPDATE"
        assert update_msg["call_id"] == ws_call_id
        assert "overall_risk_score" in update_msg
        assert "recommended_action" in update_msg
        assert update_msg["vad_active"] is True
