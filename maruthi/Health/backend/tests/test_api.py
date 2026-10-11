"""
HealthContinuum AI — Integration Tests

Run from backend/ directory:
    pytest tests/test_api.py -v

Tests hit the actual FastAPI app with an in-memory SQLite database.
All tests use synthetic data only.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from tests.conftest import TestSessionLocal


# ── Helpers ───────────────────────────────────────────────────────────────────
import uuid as _uuid_mod

async def create_test_patient(client) -> str:
    """Create a synthetic patient and return their ID."""
    unique = _uuid_mod.uuid4().hex[:8]
    res = await client.post("/api/patients", json={
        "name": "Test Patient",
        "date_of_birth": "1980-01-01",
        "gender": "Male",
        "blood_group": "O+",
        "email": f"test-{unique}@synthetic.example",
        "uhid": f"TEST-{unique}",
    })
    assert res.status_code == 201
    return res.json()["data"]["id"]


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health_check(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"


# ══════════════════════════════════════════════════════════════════════════════
# PATIENTS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_patient(client):
    res = await client.post("/api/patients", json={
        "name": "Ramesh Kumar",
        "date_of_birth": "1984-03-12",
        "gender": "Male",
        "blood_group": "B+",
        "email": "ramesh@synthetic.example",
        "uhid": "HC-TEST-001",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    assert body["data"]["name"] == "Ramesh Kumar"
    assert body["data"]["id"] is not None


@pytest.mark.asyncio
async def test_get_patient(client):
    pid = await create_test_patient(client)
    res = await client.get(f"/api/patients/{pid}")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["id"] == pid


@pytest.mark.asyncio
async def test_get_patient_not_found(client):
    res = await client.get("/api/patients/does-not-exist")
    assert res.status_code == 404
    body = res.json()
    assert body["detail"]["code"] == "PATIENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_list_patients(client):
    res = await client.get("/api/patients")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)


# ══════════════════════════════════════════════════════════════════════════════
# VISITS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_and_list_visits(client):
    pid = await create_test_patient(client)

    # Create visit
    res = await client.post(f"/api/patients/{pid}/visits", json={
        "visit_date": "2026-01-10",
        "hospital_name": "City Care Hospital",
        "doctor_name": "Dr. Sharma",
        "visit_type": "CONSULTATION",
        "summary": "Initial visit.",
    })
    assert res.status_code == 201
    vid = res.json()["data"]["id"]

    # List visits
    res2 = await client.get(f"/api/patients/{pid}/visits")
    assert res2.status_code == 200
    data = res2.json()["data"]
    assert len(data) >= 1
    assert any(v["id"] == vid for v in data)


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_create_and_list_documents(client):
    pid = await create_test_patient(client)

    res = await client.post(f"/api/patients/{pid}/documents", json={
        "document_type": "LAB_REPORT",
        "file_name": "blood_test_2026.pdf",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    assert body["data"]["document_type"] == "LAB_REPORT"
    assert body["data"]["processing_status"] == "PROCESSED"  # stub processes immediately

    # List
    res2 = await client.get(f"/api/patients/{pid}/documents")
    assert res2.status_code == 200
    assert len(res2.json()["data"]) >= 1


@pytest.mark.asyncio
async def test_invalid_document_type(client):
    pid = await create_test_patient(client)
    res = await client.post(f"/api/patients/{pid}/documents", json={
        "document_type": "INVALID_TYPE",
    })
    assert res.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# MEDICATIONS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_list_medications(client):
    pid = await create_test_patient(client)

    # Create a visit + medication via service (direct DB insert via API not exposed — test via visit)
    res = await client.get(f"/api/patients/{pid}/medications")
    assert res.status_code == 200
    assert res.json()["success"] is True


# ══════════════════════════════════════════════════════════════════════════════
# LABS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_list_labs(client):
    pid = await create_test_patient(client)
    res = await client.get(f"/api/patients/{pid}/labs")
    assert res.status_code == 200
    assert res.json()["success"] is True


# ══════════════════════════════════════════════════════════════════════════════
# CHANGES
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_list_changes(client):
    pid = await create_test_patient(client)
    res = await client.get(f"/api/patients/{pid}/changes")
    assert res.status_code == 200
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_get_change_not_found(client):
    res = await client.get("/api/changes/does-not-exist")
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "CHANGE_NOT_FOUND"


# ══════════════════════════════════════════════════════════════════════════════
# DOCTOR ACCESS
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_generate_verify_revoke_access_code(client, doctor_token):
    pid = await create_test_patient(client)
    headers = {"Authorization": f"Bearer {doctor_token}"}

    # Generate
    res = await client.post("/api/doctor-access/generate", json={
        "patient_id": pid,
        "doctor_name": "Dr. Priya Sharma",
        "requested_scopes": ["medications", "reports"],
    })
    assert res.status_code == 201
    body = res.json()
    assert body["success"] is True
    code = body["data"]["access_code"]
    access_id = body["data"]["id"]
    assert len(code) == 6
    assert code.isdigit()

    # Verify
    res2 = await client.post("/api/doctor-access/verify", json={"access_code": code}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["success"] is True
    assert res2.json()["data"]["grant"]["status"] == "active"

    # Revoke
    res3 = await client.post("/api/doctor-access/revoke", json={
        "access_id": access_id,
        "patient_id": pid,
    }, headers=headers)
    assert res3.status_code == 200
    assert res3.json()["data"]["status"] == "REVOKED"


@pytest.mark.asyncio
async def test_verify_invalid_code(client, doctor_token):
    headers = {"Authorization": f"Bearer {doctor_token}"}
    res = await client.post("/api/doctor-access/verify", json={"access_code": "000000"}, headers=headers)
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_PIN"


# ══════════════════════════════════════════════════════════════════════════════
# DECISION MEMORY
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_list_decision_memory(client):
    pid = await create_test_patient(client)
    res = await client.get(f"/api/patients/{pid}/decision-memory")
    assert res.status_code == 200
    assert res.json()["success"] is True


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_health_summary(client):
    pid = await create_test_patient(client)
    res = await client.get(f"/api/patients/{pid}/summary")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["patient"]["id"] == pid
    assert "total_visits" in body["data"]
    assert "unresolved_changes" in body["data"]


# ══════════════════════════════════════════════════════════════════════════════
# COMPANION ASK
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_companion_ask_not_found(client):
    res = await client.post("/api/patients/non-existent-id/companion/ask", json={
        "query": "What medicines am I taking?"
    })
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "PATIENT_NOT_FOUND"


@pytest.mark.asyncio
async def test_companion_ask_success(client):
    pid = await create_test_patient(client)
    res = await client.post(f"/api/patients/{pid}/companion/ask", json={
        "query": "What medicines am I currently taking?"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert "answer" in body["data"]
    assert "provider" in body["data"]
    assert isinstance(body["data"]["documented_facts"], list)

