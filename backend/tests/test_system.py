import pytest

def test_system_backups_and_audits(client):
    owner_token = client.post("/api/v1/auth/login", json={"username": "owner", "password": "lawpan123"}).json()["access_token"]
    manager_token = client.post("/api/v1/auth/login", json={"username": "manager", "password": "lawpan123"}).json()["access_token"]
    
    headers_owner = {"Authorization": f"Bearer {owner_token}"}
    headers_manager = {"Authorization": f"Bearer {manager_token}"}

    # 1. RBAC: Manager cannot trigger backup
    mgr_bk_res = client.post("/api/v1/system/backup", headers=headers_manager)
    assert mgr_bk_res.status_code == 403

    # Owner creates backup
    owner_bk_res = client.post("/api/v1/system/backup", headers=headers_owner)
    assert owner_bk_res.status_code == 200
    bk = owner_bk_res.json()
    assert "lawpan_backup_" in bk["filename"]
    assert bk["size_bytes"] >= 0

    # 2. List backups
    bk_list_res = client.get("/api/v1/system/backups", headers=headers_owner)
    assert bk_list_res.status_code == 200
    backups = bk_list_res.json()
    assert any(b["filename"] == bk["filename"] for b in backups)

    # 3. System Settings
    settings_res = client.get("/api/v1/system/settings", headers=headers_owner)
    assert settings_res.status_code == 200
    app_settings = settings_res.json()["settings"]
    assert "restaurant_name" in app_settings

    # Update setting
    up_res = client.put("/api/v1/system/settings", json={"key": "restaurant_phone", "value": "+95 9 888 777 666"}, headers=headers_owner)
    assert up_res.status_code == 200

    # 4. Audit Logs
    audit_res = client.get("/api/v1/system/audit-logs", headers=headers_owner)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert any(l["action"] in ["CREATE_BACKUP", "UPDATE_SETTING"] for l in logs)
