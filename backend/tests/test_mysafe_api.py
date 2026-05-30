"""Backend API tests for MySafe ingredient scanner app.

Covers:
- Auth (register/login/me) + JWT validation
- Auto-login flow (token -> /auth/me + /profiles)
- Profile CRUD with new pet_breed field (dog/cat/bird)
- Scan endpoint with new subcategory field
- Scan unclear-image rejection (HTTP 400)
- Speed of /api/scan (Gemini Flash + Claude Haiku)
- All freemium gates have been removed (multiple humans & pet profiles allowed)
"""
import os
import time
import pytest

# ============= AUTH TESTS =============

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_existing_user(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@mysafe.com",
            "password": "Test123!"
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@mysafe.com"
        pytest.existing_token = data["access_token"]
        pytest.existing_user_id = data["user"]["id"]

    def test_login_invalid_password(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "test@mysafe.com",
            "password": "WrongPassword!"
        })
        assert resp.status_code == 401

    def test_register_new_user(self, api_client, base_url):
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
        assert data["id"] == pytest.new_user_id

    def test_get_me_without_token(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/auth/me")
        assert resp.status_code in (401, 403)

    def test_get_me_with_invalid_token(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert resp.status_code == 401


# ============= AUTO-LOGIN FLOW =============

class TestAutoLogin:
    """Simulates the app launch auto-login: stored JWT -> /auth/me + /profiles"""

    def test_auto_login_me_and_profiles(self, api_client, base_url):
        headers = {"Authorization": f"Bearer {pytest.new_token}"}
        me = api_client.get(f"{base_url}/api/auth/me", headers=headers)
        assert me.status_code == 200, f"/auth/me failed: {me.text}"
        assert me.json()["id"] == pytest.new_user_id

        profiles = api_client.get(f"{base_url}/api/profiles", headers=headers)
        assert profiles.status_code == 200, f"/profiles failed: {profiles.text}"
        assert isinstance(profiles.json(), list)


# ============= PROFILE TESTS =============

class TestProfiles:
    """Profile management - freemium gates removed; pet_breed supported"""

    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_list_profiles_empty(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/profiles", headers=self._headers())
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_human_profile(self, api_client, base_url):
        payload = {
            "name": "TEST Adult Profile",
            "profile_type": "human",
            "date_of_birth": "1994-01-15",
            "biological_sex": "female",
            "is_pregnant_nursing": False,
            "skin_type": "combination",
            "hair_type": "wavy",
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
        assert data["skin_type"] == "combination"
        pytest.human_profile_id = data["id"]

    def test_create_second_human_profile_now_allowed(self, api_client, base_url):
        """Freemium gates removed - a second human profile must succeed"""
        payload = {
            "name": "TEST Second Human",
            "profile_type": "human",
            "date_of_birth": "1999-05-05"
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 200, f"Second human profile should succeed: {resp.text}"

    # ---- pet_breed coverage ----

    def test_create_dog_profile_with_labrador_breed(self, api_client, base_url):
        payload = {
            "name": "TEST Buddy",
            "profile_type": "pet",
            "pet_type": "dog",
            "pet_breed": "Labrador Retriever",
            "date_of_birth": "2020-03-10",
            "weight_kg": 28.0,
            "fixed_status": "neutered",
            "pet_medical_conditions": []
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 200, f"Dog profile failed: {resp.text}"
        data = resp.json()
        assert data["pet_type"] == "dog"
        assert data["pet_breed"] == "Labrador Retriever", \
            f"pet_breed not stored correctly: {data}"
        pytest.dog_profile_id = data["id"]

    def test_create_cat_profile_with_persian_breed(self, api_client, base_url):
        payload = {
            "name": "TEST Whiskers",
            "profile_type": "pet",
            "pet_type": "cat",
            "pet_breed": "Persian",
            "weight_kg": 4.5,
            "fixed_status": "spayed"
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 200, f"Cat profile failed: {resp.text}"
        assert resp.json()["pet_breed"] == "Persian"

    def test_create_bird_profile_with_cockatiel_breed(self, api_client, base_url):
        payload = {
            "name": "TEST Tweety",
            "profile_type": "pet",
            "pet_type": "bird",
            "pet_breed": "Cockatiel",
            "weight_kg": 0.09
        }
        resp = api_client.post(
            f"{base_url}/api/profiles", json=payload, headers=self._headers()
        )
        assert resp.status_code == 200, f"Bird profile failed: {resp.text}"
        assert resp.json()["pet_breed"] == "Cockatiel"
        assert resp.json()["pet_type"] == "bird"

    def test_get_profiles_returns_pet_breed_field(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/profiles", headers=self._headers())
        assert resp.status_code == 200
        profiles = resp.json()
        # We created 2 humans + 3 pets
        assert len(profiles) == 5, f"Expected 5 profiles, got {len(profiles)}"

        pets = [p for p in profiles if p["profile_type"] == "pet"]
        assert len(pets) == 3
        breeds = {p["pet_type"]: p["pet_breed"] for p in pets}
        assert breeds == {
            "dog": "Labrador Retriever",
            "cat": "Persian",
            "bird": "Cockatiel"
        }, f"Breeds mismatch: {breeds}"

        # Every profile in list must expose the pet_breed key (None for humans)
        for p in profiles:
            assert "pet_breed" in p

    def test_get_single_profile(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/profiles/{pytest.dog_profile_id}",
            headers=self._headers()
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == pytest.dog_profile_id
        assert data["pet_breed"] == "Labrador Retriever"

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
    """Scan endpoint - subcategory field + unclear-image rejection"""

    # 1x1 transparent PNG (definitely unscannable)
    TINY_PNG_B64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAA"
        "AAYAAjCB0C8AAAAASUVORK5CYII="
    )

    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_list_scans_empty(self, api_client, base_url):
        resp = api_client.get(f"{base_url}/api/scans", headers=self._headers())
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_scans_filter_by_profile(self, api_client, base_url):
        resp = api_client.get(
            f"{base_url}/api/scans",
            params={"profile_id": pytest.human_profile_id},
            headers=self._headers()
        )
        assert resp.status_code == 200
        for s in resp.json():
            assert s["profile_id"] == pytest.human_profile_id
            # subcategory must always be present in the response
            assert "subcategory" in s

    def test_scan_with_unclear_image_returns_400(self, api_client, base_url):
        """CRITICAL: blank 1x1 image must be rejected with 400 (never 10/10)"""
        t0 = time.time()
        resp = api_client.post(
            f"{base_url}/api/scan",
            json={
                "profile_id": pytest.human_profile_id,
                "image_base64": self.TINY_PNG_B64
            },
            headers=self._headers(),
            timeout=90
        )
        elapsed = time.time() - t0
        print(f"\n[SPEED] /api/scan unclear-image rejection took {elapsed:.2f}s "
              f"(Gemini Flash; should be <8s typically)")
        pytest.scan_elapsed_unclear = elapsed

        if resp.status_code == 200:
            data = resp.json()
            pytest.fail(
                f"CRITICAL BUG: Unclear image returned 200 score={data.get('score')} "
                f"verdict={data.get('verdict')} subcategory={data.get('subcategory')}. "
                f"Expected 400 'Image unclear'."
            )
        assert resp.status_code == 400, \
            f"Expected 400 for unclear image, got {resp.status_code}: {resp.text}"
        assert "unclear" in resp.text.lower()

    def test_scan_invalid_profile_id(self, api_client, base_url):
        resp = api_client.post(
            f"{base_url}/api/scan",
            json={
                "profile_id": "nonexistent-profile",
                "image_base64": self.TINY_PNG_B64
            },
            headers=self._headers(),
            timeout=90
        )
        assert resp.status_code == 404

    def test_scan_without_auth(self, api_client, base_url):
        resp = api_client.post(f"{base_url}/api/scan", json={
            "profile_id": "x", "image_base64": "abc"
        })
        assert resp.status_code in (401, 403)


# ============= COMPARE (free for everyone now) =============

class TestCompare:
    def _headers(self):
        return {"Authorization": f"Bearer {pytest.new_token}"}

    def test_compare_with_missing_scans_returns_404(self, api_client, base_url):
        """Freemium gate removed; with non-existent scans we should get 404, not 403"""
        resp = api_client.post(
            f"{base_url}/api/compare",
            params={"scan1_id": "missing-a", "scan2_id": "missing-b"},
            headers=self._headers()
        )
        assert resp.status_code == 404, \
            f"Expected 404 for missing scans (no more freemium 403): {resp.status_code} {resp.text}"


# ============= CLEANUP =============

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data(base_url):
    yield
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
