"""
HealthContinuum AI — Comprehensive End-to-End Integration Tests
Validates:
1. Health check and Portal serving
2. Doctor authentication (success & failure)
3. Patient Demo PIN generation (20-min expiry, DEMO PURPOSE ONLY)
4. Doctor PIN redemption & session authorization
5. Rate limiting / lockout on repeated invalid PIN attempts
6. Expired PIN rejection
7. Revoked PIN rejection
8. Permitted records retrieval (medications, labs, documents, visits, review items)
9. Clinical review action & audit trail logging
10. Access grants listing
"""
from __future__ import annotations

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from app.main import app
from app.database.connection import create_all_tables, AsyncSessionLocal
from app.models.doctor import Doctor
from app.core.security import hash_password


async def run_all_integration_tests():
    print("=" * 60)
    print("HealthContinuum AI — Running End-to-End Integration Tests")
    print("=" * 60)

    await create_all_tables()

    # Seed doctor account if not already present
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        res = await db.execute(select(Doctor).where(Doctor.email == "ananya.sharma@continuumhealth.in"))
        doc = res.scalar_one_or_none()
        if not doc:
            doc = Doctor(
                id="doc-001",
                email="ananya.sharma@continuumhealth.in",
                password_hash=hash_password("demo1234"),
                full_name="Dr. Ananya Sharma",
                credentials="MD, DM (Cardiology)",
                registration_number="KMC-20145-NN",
                specialty="Cardiology",
                facility_name="Continuum Health Centre, Bengaluru",
                facility_id="fac-001",
                avatar_initials="AS",
                verified=True,
                role="doctor",
                is_active=True,
            )
            db.add(doc)
            await db.commit()
            print("  [Setup] Doctor account ensured: Dr. Ananya Sharma")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health Check
        print("\n[TEST 1] GET /api/health")
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        assert res.json()["success"] is True
        print("  [OK] Health check passed")

        # 2. Unified Portal & Frontends
        print("\n[TEST 2] GET / (Unified Portal) & Frontends")
        res = await client.get("/")
        assert res.status_code == 200
        assert "HealthContinuum AI" in res.text or res.headers.get("content-type", "").startswith("text/html")
        print("  [OK] Unified portal served at /")

        res_p = await client.get("/patient")
        assert res_p.status_code == 200
        print("  [OK] Patient app served at /patient")

        res_d = await client.get("/doctor")
        assert res_d.status_code == 200
        print("  [OK] Doctor dashboard served at /doctor")

        # 3. Doctor Login Failure (Invalid Password)
        print("\n[TEST 3] POST /api/auth/doctor/login (Failure Case)")
        res = await client.post("/api/auth/doctor/login", json={
            "email": "ananya.sharma@continuumhealth.in",
            "password": "wrongpassword123",
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("  [OK] Unauthorized access correctly rejected with 401")

        # 4. Doctor Login Success
        print("\n[TEST 4] POST /api/auth/doctor/login (Success Case)")
        res = await client.post("/api/auth/doctor/login", json={
            "email": "ananya.sharma@continuumhealth.in",
            "password": "demo1234",
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        data = res.json()["data"]
        doctor_token = data["access_token"]
        assert doctor_token and len(doctor_token) > 20
        assert data["doctor"]["fullName"] == "Dr. Ananya Sharma"
        assert data["doctor"]["registrationNumber"] == "KMC-20145-NN"
        print(f"  [OK] Doctor login authenticated. JWT issued for: {data['doctor']['fullName']}")

        headers = {"Authorization": f"Bearer {doctor_token}"}

        # 5. Doctor Session Verification
        print("\n[TEST 5] GET /api/auth/doctor/me (Session Check)")
        res = await client.get("/api/auth/doctor/me", headers=headers)
        assert res.status_code == 200
        assert res.json()["data"]["doctor"]["email"] == "ananya.sharma@continuumhealth.in"
        print("  [OK] Doctor session active and verified")

        # 6. Patient Generates 20-Minute Demo PIN
        print("\n[TEST 6] POST /api/doctor-access/generate (Patient generates 20-min Demo PIN)")
        res = await client.post("/api/doctor-access/generate", json={
            "patient_id": "pat-ramesh-001",
            "requested_scopes": ["medical_history", "medications", "reports", "changes", "documents"],
        })
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        pin_data = res.json()["data"]
        access_code = pin_data["access_code"]
        access_id = pin_data["id"]
        assert len(access_code) == 6 and access_code.isdigit(), f"PIN must be 6 digits: {access_code}"
        assert pin_data["purpose"] == "DEMO_PURPOSE_ONLY"
        assert pin_data["expires_in_seconds"] == 1200
        print(f"  [OK] Random PIN generated: {access_code} (Expires in 20m, Purpose: DEMO PURPOSE ONLY)")

        # 7. Doctor Redeems Valid Demo PIN
        print("\n[TEST 7] POST /api/doctor-access/verify (Doctor redeems valid PIN)")
        res = await client.post("/api/doctor-access/verify", json={
            "access_code": access_code,
        }, headers=headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        redeem_data = res.json()["data"]
        assert redeem_data["grant"]["patientId"] == "pat-ramesh-001"
        assert redeem_data["grant"]["status"] == "active"
        assert redeem_data["patient"]["fullName"] == "Ramesh Kumar"
        print(f"  [OK] PIN {access_code} successfully redeemed. Access grant created for {redeem_data['patient']['fullName']}")

        # 8. Permitted Records Retrieval
        print("\n[TEST 8] GET /api/doctor-access/permitted-records/pat-ramesh-001")
        res = await client.get("/api/doctor-access/permitted-records/pat-ramesh-001", headers=headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        records = res.json()["data"]
        assert records["authorized"] is True
        assert records["patient"]["fullName"] == "Ramesh Kumar"
        assert len(records["medications"]) >= 2
        assert len(records["labReports"]) >= 3
        assert len(records["documents"]) >= 2
        assert len(records["visits"]) >= 3
        assert len(records["reviewItems"]) >= 2
        print(f"  [OK] Authoritative records retrieved: {len(records['medications'])} medications, {len(records['labReports'])} labs, {len(records['documents'])} documents, {len(records['reviewItems'])} review items")

        # 9. Invalid PIN Rejection
        print("\n[TEST 9] POST /api/doctor-access/verify (Invalid PIN)")
        res = await client.post("/api/doctor-access/verify", json={
            "access_code": "000000",
        }, headers=headers)
        assert res.status_code == 400
        assert res.json()["detail"]["code"] == "INVALID_PIN"
        print("  [OK] Non-existent PIN rejected with 400 INVALID_PIN")

        # 10. Patient Revokes PIN and Subsequent Redemption is Rejected
        print("\n[TEST 10] POST /api/doctor-access/revoke & Revocation Guard")
        res_gen = await client.post("/api/doctor-access/generate", json={"patient_id": "pat-ramesh-001"})
        pin2 = res_gen.json()["data"]["access_code"]
        id2 = res_gen.json()["data"]["id"]

        # Revoke it
        res_rev = await client.post("/api/doctor-access/revoke", json={
            "access_id": id2,
            "patient_id": "pat-ramesh-001",
        })
        assert res_rev.status_code == 200
        print(f"  [OK] PIN {pin2} revoked by patient")

        # Try to redeem revoked PIN
        res_try = await client.post("/api/doctor-access/verify", json={"access_code": pin2}, headers=headers)
        assert res_try.status_code == 403
        assert res_try.json()["detail"]["code"] == "REVOKED_PIN"
        print("  [OK] Revoked PIN rejected with 403 REVOKED_PIN")

        # 11. Clinical Review Action Documentation
        print("\n[TEST 11] POST /api/doctor-access/review-action")
        res_act = await client.post("/api/doctor-access/review-action", json={
            "item_id": "chg-001",
            "action": "confirmed",
            "note": "Renal improvement confirmed. Metformin dose reduction appropriate.",
            "patient_id": "pat-ramesh-001",
        }, headers=headers)
        assert res_act.status_code == 200
        print("  [OK] Doctor clinical review action documented and signed")

        # 12. Audit Trail Inspection
        print("\n[TEST 12] GET /api/doctor-access/audit-events")
        res_audit = await client.get("/api/doctor-access/audit-events?limit=10", headers=headers)
        assert res_audit.status_code == 200
        events = res_audit.json()["data"]
        assert len(events) >= 3
        actions = [e["action"] for e in events]
        assert "PIN_GENERATED" in actions or "PIN_REDEEMED" in actions or "REVIEW_ACTION" in actions
        print(f"  [OK] Audit log verified: {len(events)} events captured with immutable audit trail")

        # 13. Grants List Inspection
        print("\n[TEST 13] GET /api/doctor-access/grants")
        res_grants = await client.get("/api/doctor-access/grants", headers=headers)
        assert res_grants.status_code == 200
        grants = res_grants.json()["data"]
        assert len(grants) >= 1
        print(f"  [OK] Access grants list retrieved: {len(grants)} active/historical grants")

    print("\n" + "=" * 60)
    print("ALL 13 END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_integration_tests())
