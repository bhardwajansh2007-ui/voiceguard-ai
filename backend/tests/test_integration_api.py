from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_integration_status_endpoint():
    res = client.get("/api/v1/integration/status")
    assert res.status_code == 200
    data = res.json()
    assert data["gateway_name"] == "VoiceGuard-AI-Gateway"
    assert "disclaimer" in data
    assert len(data["sources"]) >= 4

    # Verify transparent source states: Sandbox CONNECTED, External PBX NOT CONFIGURED
    sandbox = next((s for s in data["sources"] if s["id"] == "COMMUNICATION_SANDBOX"), None)
    assert sandbox is not None
    assert sandbox["status"] == "CONNECTED"

    external = next((s for s in data["sources"] if s["id"] == "EXTERNAL_PBX"), None)
    assert external is not None
    assert external["status"] == "NOT_CONFIGURED"

    # Verify API specifications exist
    assert len(data["api_endpoints"]) >= 5
