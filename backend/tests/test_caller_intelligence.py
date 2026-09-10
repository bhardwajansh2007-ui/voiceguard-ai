import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(subject="admin", role="ADMIN")
    return {"Authorization": f"Bearer {token}"}

def test_list_identities(auth_headers):
    response = client.get("/api/v1/speakers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Rahul Sharma reference profile should be present from init_db
    handles = [item["speaker_id"] for item in data]
    assert "EMP-9021" in handles

def test_caller_intelligence_lookup(auth_headers):
    response = client.get("/api/v1/caller-intelligence/lookup?query=EMP-9021", headers=auth_headers)
    assert response.status_code == 200
    dossier = response.json()
    assert dossier["caller_name"] == "Rahul Sharma"
    assert dossier["organization"] == "ABC Bank"
    assert dossier["identity_status"] == "VERIFIED"
    assert "recommended_decision" in dossier
    assert "overall_risk_level" in dossier

def test_simulate_sensitive_action(auth_headers):
    # Create a call session first
    create_res = client.post("/api/v1/calls", json={
        "caller_id": "+91 98765 43210",
        "claimed_identity": "EMP-9021",
        "action_type": "FINANCIAL_ACTION",
        "action_sensitivity": "HIGH",
        "transaction_amount": 2500000.0,
    }, headers=auth_headers)
    assert create_res.status_code == 201
    call_id = create_res.json()["call_id"]

    # Trigger sensitive action simulation
    sim_res = client.post("/api/v1/security/actions/simulate-sensitive-action", json={
        "call_id": call_id,
        "action_type": "FINANCIAL_ACTION",
        "action_description": "Transfer ₹25,00,000 immediately",
        "simulated_amount": 2500000.0,
    }, headers=auth_headers)
    assert sim_res.status_code == 200
    data = sim_res.json()
    assert data["decision"] == "HOLD_SENSITIVE_ACTION"
    assert data["status"] == "HOLD"
    assert data["simulated_only"] is True
