"""Backend API tests for MySafe ingredient scanner app"""
import os
import time
import base64
import pytest
import requests

# ============= AUTH TESTS =============

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_existing_user(self, api_client, base_url):
        """Login existing test user from test_credentials.md"""
        resp = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@mysafe.com",
            "password": "Test123!"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@mysafe.com"
        assert data["user"]["subscription_status"] == "free"
        pytest.existing_token = data["access_token"]
        pytest.existing_user_id = data["user"]["id"]

    def test_login_invalid_password(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@mysafe.com",
            "password": "WrongPassword!"
        })
        assert resp.status_code == 401

    def test_register_new_user(self, api_client, base_url):
        """Register a brand-new user (cleaned later)"""
        ts = int(time.time())
        email = f"TEST_new_{ts}@mysafe.com"
        resp = api_client.post(f"{base_url}/api/auth/register", json={
            "email": email,
            "password": "Pass1234!",
            "name": "TEST New User"
        })
        assert resp.status_code == 200, f"Register failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == email
        assert data["user"]["subscription_status"] == "free"
        pytest.new_token = data["access_token"]
        pytest.new_email = email
        pytest.new_user_id = data["user"]["id"]

    def test_register_duplicate_email(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/register", json={
            "email": pytest.new_email,
            "password": "Pass1234!",
            "name": "Duplicate"
        })
        assert resp.status_code == 400

    def test_get_me_with_valid_token(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": f"Bearer {pytest.new_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == pytest.new_email
        assert data["subscription_status"] == "free"

    def test_get_me_without_token(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/auth/me")
        # FastAPI HTTPBearer returns 403 (not 401) when header is missing
        assert resp.status_code in (401, 403)

    def test_get_me_with_invalid_token(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert resp.status_code == 401


# ============= PROFILE TESTS =============

class TestProfiles:
    """Profile management tests (uses fresh user from registration)"""

    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_list_profiles_empty(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/profiles", headers=self._headers())
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) == 0

    def test_create_first_human_profile_free_tier(self, api_client, base_url):
        payload = {
            "name": "TEST Adult Profile",
            "profile_type": "human",
            "age_value": 30,
            "age_unit": "years",
            "biological_sex": "female",
            "is_pregnant_nursing": False,
            "medical_conditions": ["hypertension"],
            "allergies": ["peanuts"]
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 200, f"Create profile failed: {resp.text}"
        data = resp.json()
        assert data["name"] == payload["name"]
        assert data["profile_type"] == "human"
        assert data["user_id"] == pytest.new_user_id
        assert "id" in data
        pytest.new_profile_id = data["id"]

    def test_get_profiles_after_create(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/profiles", headers=self._headers())
        assert resp.status_code == 200
        profiles = resp.json()
        assert len(profiles) == 1
        assert profiles[0]["id"] == pytest.new_profile_id

    def test_create_second_human_profile_free_tier_should_fail(self, api_client, base_url):
        payload = {
            "name": "TEST Second Human",
            "profile_type": "human",
            "age_value": 25,
            "age_unit": "years"
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 403, f"Expected 403 free-tier limit, got {resp.status_code}: {resp.text}"
        assert "premium" in resp.text.lower() or "free tier" in resp.text.lower()

    def test_create_pet_profile_free_tier_should_fail(self, api_client, base_url):
        payload = {
            "name": "TEST Dog",
            "profile_type": "pet",
            "pet_type": "dog",
            "age_value": 5,
            "age_unit": "years",
            "weight_kg": 20.0,
            "fixed_status": "neutered"
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 403, f"Expected 403 for pet on free tier, got {resp.status_code}: {resp.text}"
        assert "premium" in resp.text.lower()

    def test_get_single_profile(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/profiles/{pytest.new_profile_id}",
            headers=self._headers()
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == pytest.new_profile_id

    def test_get_profile_not_found(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/profiles/nonexistent-id",
            headers=self._headers()
        )
        assert resp.status_code == 404

    def test_create_profile_without_auth(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/profiles", json={
            "name": "noauth", "profile_type": "human"
        })
        assert resp.status_code in (401, 403)


# ============= SCAN TESTS =============

class TestScans:
    """Scan endpoint tests (OCR + AI scoring)"""

    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_list_scans_empty(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/scans", headers=self._headers())
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_scans_filter_by_profile(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/scans",
            params={"profile_id": pytest.new_profile_id},
            headers=self._headers()
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        # All returned scans must belong to that profile
        for scan in resp.json():
            assert scan["profile_id"] == pytest.new_profile_id

    def test_scan_with_unclear_image_returns_400(self, api_client, base_url):
        """CRITICAL: 1x1 px blank image should be rejected as unclear (NEVER 10/10)"""
        # 1x1 transparent PNG
        tiny_png_b64 = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        )
        payload = {
            "profile_id": pytest.new_profile_id,
            "image_base64": tiny_png_b64
        }
        resp = api_client.post(
            f"{base_url}/api/scan", json=payload, headers=self._headers(), timeout=60
        )
        # Must NOT be a 200 with a 10/10 score
        if resp.status_code == 200:
            data = resp.json()
            pytest.fail(
                f"CRITICAL BUG: Unclear image returned 200 with score={data.get('score')} "
                f"verdict={data.get('verdict')}. Expected 400 'Image unclear'."
            )
        assert resp.status_code == 400, f"Expected 400 for unclear image, got {resp.status_code}: {resp.text}"
        assert "unclear" in resp.text.lower()

    def test_scan_invalid_profile_id(self, api_client, base_url):
        payload = {
            "profile_id": "nonexistent-profile",
            "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        }
        resp = api_client.post(
            f"{base_url}/api/scan", json=payload, headers=self._headers(), timeout=60
        )
        assert resp.status_code == 404

    def test_scan_without_auth(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/scan", json={
            "profile_id": "x", "image_base64": "abc"
        })
        assert resp.status_code in (401, 403)


# ============= COMPARE (free-tier should fail) =============

class TestCompare:
    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_compare_free_tier_fails(self, api_client, base_url):
        resp = api_client.post(
            f"{base_url}/api/compare",
            params={"scan1_id": "a", "scan2_id": "b"},
            headers=self._headers()
        )
        assert resp.status_code == 403


# ============= CLEANUP =============

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(base_url):
    """Cleanup created test data at end of session"""
    yield
    # Cleanup via direct MongoDB access since no DELETE endpoints exist
    try:
        from pymongo import MongoClient
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path("/app/backend/.env"))
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if mongo_url and db_name:
            mc = MongoClient(mongo_url)
            mdb = mc[db_name]
            email = getattr(pytest, "new_email", None)
            user_id = getattr(pytest, "new_user_id", None)
            if user_id:
                mdb.scans.delete_many({"user_id": user_id})
                mdb.profiles.delete_many({"user_id": user_id})
            if email:
                mdb.users.delete_many({"email": email})
            mc.close()
    except Exception as e:
        print(f"Cleanup error (non-fatal): {e}")
