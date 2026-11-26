import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    raw_pwd = "my_secret_password"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_jwt_token_encode_decode():
    data = {"sub": "testuser", "role": "WAITER"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "testuser"
    assert decoded["role"] == "WAITER"

def test_login_success_owner(client):
    response = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "OWNER"
    assert data["user"]["username"] == "owner"
    assert len(data["user"]["permissions"]) > 0

def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={"username": "owner", "password": "wrongpassword"})
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

def test_login_and_access_me_profile(client):
    # Login as waiter
    login_resp = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Access /me
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "waiter"
    assert me_data["role"] == "WAITER"

def test_rbac_user_management_access_control(client):
    # Waiter token
    waiter_token = client.post("/api/v1/auth/login", json={"username": "waiter", "password": "lawpan123"}).json()["access_token"]
    # Owner token
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]

    # Waiter trying to list users -> FORBIDDEN (403)
    waiter_resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {waiter_token}"})
    assert waiter_resp.status_code == 403

    # Owner listing users -> SUCCESS (200)
    owner_resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {owner_token}"})
    assert owner_resp.status_code == 200
    users_list = owner_resp.json()
    assert len(users_list) >= 5 # owner, manager, waiter, cashier, kitchen
