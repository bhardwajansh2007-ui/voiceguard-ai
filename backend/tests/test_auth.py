import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import verify_password, hash_password

client = TestClient(app)


def test_password_hashing():
    pwd = "SecureAnalystPassphrase2026!"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False


def test_admin_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "VoiceGuardAdmin2026!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["token_type"] == "bearer"


def test_invalid_login():
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "admin", "password": "IncorrectPassword!"},
    )
    assert response.status_code == 401


def test_user_registration_and_login():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    username = f"analyst_{suffix}"
    email = f"analyst_{suffix}@voiceguard.internal"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "username": username,
            "email": email,
            "password": "StrongPassword987!",
            "role": "SECURITY_ANALYST",
        },
    )
    assert response.status_code == 201
    user_data = response.json()
    assert user_data["username"] == username
    assert user_data["role"] == "SECURITY_ANALYST"

    # Login with the newly registered user
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": username, "password": "StrongPassword987!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Verify /me endpoint
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["username"] == username
