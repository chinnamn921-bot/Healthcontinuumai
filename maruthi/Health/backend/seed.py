"""
HealthContinuum AI — Database Seed Script

Creates realistic synthetic data for demo/hackathon purposes.
Run: python seed.py   (from the backend/ directory)

Patient: Ramesh Kumar, 42
- 3 visits with medications, lab results, documents
- 1 documented medication change (reason found)
- 1 medication change with missing reason
- 1 clinical note referencing an MRI (report not attached = evidence incomplete)
- Decision memory chain
- Sample change events with all 3 statuses

IMPORTANT: Uses synthetic data only. No real patient information.
"""
from __future__ import annotations

import asyncio
import sys
import os

# Make sure we can import from app/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import AsyncSessionLocal, create_all_tables
from app.models.change_event import ChangeEvent
from app.models.clinical_decision import ClinicalDecision
from app.models.decision_memory import DecisionMemory
from app.models.document import Document
from app.models.evidence import Evidence
from app.models.lab_result import LabResult
from app.models.medication import Medication
from app.models.patient import Patient
from app.models.visit import Visit
from app.models.doctor import Doctor
from app.core.security import hash_password


async def seed(db: AsyncSession) -> None:
    print("[SEED] Seeding HealthContinuum AI database...")

    # ── PATIENT ─────────────────────────────────────────────────────────────
    patient = Patient(
        id="pat-ramesh-001",
        name="Ramesh Kumar",
        date_of_birth="1984-03-12",
        gender="Male",
        blood_group="B+",
        phone="+91 98765 43210",
        email="ramesh.kumar@synthetic.example",
        uhid="HC-2024-00847",
    )
    db.add(patient)
    await db.flush()
    print(f"  [OK] Patient created: {patient.name} ({patient.id})")

    # ── VISIT 1 — January 2026 ───────────────────────────────────────────────
    visit1 = Visit(
        id="visit-001",
        patient_id=patient.id,
        visit_date="2026-01-10",
        hospital_name="City Care Hospital, Chennai",
        doctor_name="Dr. Priya Sharma",
        visit_type="CONSULTATION",
        summary=(
            "Initial consultation for diabetes management. "
            "HbA1c elevated at 7.8%. Kidney function within normal range. "
            "Blood pressure controlled. Metformin continued at current dose."
        ),
    )
    db.add(visit1)
    await db.flush()
    print(f"  [OK] Visit 1 created: {visit1.visit_date}")

    # Document for Visit 1
    doc1 = Document(
        id="doc-001",
        patient_id=patient.id,
        visit_id=visit1.id,
        document_type="CLINICAL_NOTE",
        file_name="clinical_note_jan_2026.pdf",
        processing_status="PROCESSED",
        extracted_text=(
            "Patient: Ramesh Kumar | Date: 10 Jan 2026\n"
            "Diagnosis: Type 2 Diabetes Mellitus\n"
            "HbA1c: 7.8% (above target)\n"
            "Serum Creatinine: 1.1 mg/dL (within range)\n"
            "eGFR: 68 mL/min (Stage G2)\n"
            "BP: 128/82 mmHg (controlled)\n"
            "Plan: Continue Metformin 500mg twice daily. Repeat HbA1c in 8 weeks."
        ),
    )
    db.add(doc1)

    # Medication — Visit 1
    med1_v1 = Medication(
        id="med-001",
        patient_id=patient.id,
        visit_id=visit1.id,
        source_document_id=doc1.id,
        name="Metformin",
        dosage="500 mg",
        frequency="Twice daily",
        route="Oral",
        status="HISTORICAL",
        start_date="2026-01-10",
        end_date="2026-06-20",
    )
    db.add(med1_v1)

    # Lab — Visit 1
    lab1_v1 = LabResult(
        id="lab-001",
        patient_id=patient.id,
        visit_id=visit1.id,
        source_document_id=doc1.id,
        test_name="HbA1c",
        value="7.8",
        unit="%",
        reference_range="< 7.0",
        test_date="2026-01-10",
    )
    db.add(lab1_v1)

    lab2_v1 = LabResult(
        id="lab-002",
        patient_id=patient.id,
        visit_id=visit1.id,
        source_document_id=doc1.id,
        test_name="Serum Creatinine",
        value="1.1",
        unit="mg/dL",
        reference_range="0.7–1.2",
        test_date="2026-01-10",
    )
    db.add(lab2_v1)

    lab3_v1 = LabResult(
        id="lab-003",
        patient_id=patient.id,
        visit_id=visit1.id,
        source_document_id=doc1.id,
        test_name="eGFR",
        value="68",
        unit="mL/min/1.73m²",
        reference_range="> 60",
        test_date="2026-01-10",
    )
    db.add(lab3_v1)

    # ── VISIT 2 — March 2026 ─────────────────────────────────────────────────
    visit2 = Visit(
        id="visit-002",
        patient_id=patient.id,
        visit_date="2026-03-15",
        hospital_name="City Care Hospital, Chennai",
        doctor_name="Dr. Priya Sharma",
        visit_type="FOLLOW_UP",
        summary=(
            "Follow-up for diabetes. HbA1c improved to 7.1%. "
            "Renal function stable. Medication unchanged. "
            "Review again in 3 months."
        ),
    )
    db.add(visit2)
    await db.flush()
    print(f"  [OK] Visit 2 created: {visit2.visit_date}")

    doc2 = Document(
        id="doc-002",
        patient_id=patient.id,
        visit_id=visit2.id,
        document_type="CLINICAL_NOTE",
        file_name="clinical_note_mar_2026.pdf",
        processing_status="PROCESSED",
        extracted_text=(
            "Patient: Ramesh Kumar | Date: 15 Mar 2026\n"
            "HbA1c: 7.1% (improving)\n"
            "Serum Creatinine: 1.0 mg/dL\n"
            "eGFR: 74 mL/min\n"
            "Plan: Continue Metformin 500mg twice daily. Review in 3 months."
        ),
    )
    db.add(doc2)

    med1_v2 = Medication(
        id="med-002",
        patient_id=patient.id,
        visit_id=visit2.id,
        source_document_id=doc2.id,
        name="Metformin",
        dosage="500 mg",
        frequency="Twice daily",
        route="Oral",
        status="HISTORICAL",
        start_date="2026-03-15",
        end_date="2026-06-20",
    )
    db.add(med1_v2)

    lab1_v2 = LabResult(
        id="lab-004",
        patient_id=patient.id,
        visit_id=visit2.id,
        source_document_id=doc2.id,
        test_name="HbA1c",
        value="7.1",
        unit="%",
        reference_range="< 7.0",
        test_date="2026-03-15",
    )
    db.add(lab1_v2)

    lab2_v2 = LabResult(
        id="lab-005",
        patient_id=patient.id,
        visit_id=visit2.id,
        source_document_id=doc2.id,
        test_name="eGFR",
        value="74",
        unit="mL/min/1.73m²",
        reference_range="> 60",
        test_date="2026-03-15",
    )
    db.add(lab2_v2)

    # ── VISIT 3 — June 2026 ──────────────────────────────────────────────────
    visit3 = Visit(
        id="visit-003",
        patient_id=patient.id,
        visit_date="2026-06-20",
        hospital_name="City Care Hospital, Chennai",
        doctor_name="Dr. Priya Sharma",
        visit_type="FOLLOW_UP",
        summary=(
            "Significant improvement in glycaemic control. HbA1c 6.5% (at target). "
            "Renal function improved substantially (eGFR 82). "
            "Metformin dosage reduced due to improved renal function. "
            "MRI of lumbar spine ordered — findings pending."
        ),
    )
    db.add(visit3)
    await db.flush()
    print(f"  [OK] Visit 3 created: {visit3.visit_date}")

    # Clinical note — DOCUMENTED CHANGE (Metformin dose reduction with reason)
    doc3 = Document(
        id="doc-003",
        patient_id=patient.id,
        visit_id=visit3.id,
        document_type="CLINICAL_NOTE",
        file_name="clinical_note_jun_2026.pdf",
        processing_status="PROCESSED",
        extracted_text=(
            "Patient: Ramesh Kumar | Date: 20 Jun 2026\n"
            "HbA1c: 6.5% (at target — excellent control)\n"
            "Serum Creatinine: 0.95 mg/dL\n"
            "eGFR: 82 mL/min (improved from 74)\n"
            "Decision: Metformin dosage reduced due to improved renal function.\n"
            "Previous dose: 500mg twice daily. New dose: 500mg once daily.\n"
            "Reason: Improved renal function — risk of lactic acidosis reduced.\n"
            "Also: Aspirin 75mg once daily added to prescription.\n"
            "Note: Treatment modified based on MRI findings. MRI report to follow."
        ),
    )
    db.add(doc3)

    # Prescription document
    doc4 = Document(
        id="doc-004",
        patient_id=patient.id,
        visit_id=visit3.id,
        document_type="PRESCRIPTION",
        file_name="prescription_jun_2026.pdf",
        processing_status="PROCESSED",
        extracted_text=(
            "Rx | Date: 20 Jun 2026 | Dr. Priya Sharma\n"
            "1. Metformin 500mg — Once daily (morning)\n"
            "2. Aspirin 75mg — Once daily (after food)\n"
        ),
    )
    db.add(doc4)

    # NOTE: doc5 (MRI report) is NOT created — this is intentional.
    # The clinical note references MRI findings but the report is missing.
    # This creates the "Evidence Incomplete" scenario.

    # Current medications — Visit 3
    med_metformin_current = Medication(
        id="med-003",
        patient_id=patient.id,
        visit_id=visit3.id,
        source_document_id=doc4.id,
        name="Metformin",
        dosage="500 mg",
        frequency="Once daily",
        route="Oral",
        status="CURRENT",
        start_date="2026-06-20",
    )
    db.add(med_metformin_current)

    med_aspirin = Medication(
        id="med-004",
        patient_id=patient.id,
        visit_id=visit3.id,
        source_document_id=doc4.id,
        name="Aspirin",
        dosage="75 mg",
        frequency="Once daily",
        route="Oral",
        status="CURRENT",
        start_date="2026-06-20",
    )
    db.add(med_aspirin)

    lab1_v3 = LabResult(
        id="lab-006",
        patient_id=patient.id,
        visit_id=visit3.id,
        source_document_id=doc3.id,
        test_name="HbA1c",
        value="6.5",
        unit="%",
        reference_range="< 7.0",
        test_date="2026-06-20",
    )
    db.add(lab1_v3)

    lab2_v3 = LabResult(
        id="lab-007",
        patient_id=patient.id,
        visit_id=visit3.id,
        source_document_id=doc3.id,
        test_name="eGFR",
        value="82",
        unit="mL/min/1.73m²",
        reference_range="> 60",
        test_date="2026-06-20",
    )
    db.add(lab2_v3)

    await db.flush()

    # ── CLINICAL DECISIONS ───────────────────────────────────────────────────

    # Decision 1 — Documented + Verified (Metformin dose reduction)
    cd1 = ClinicalDecision(
        id="cd-001",
        patient_id=patient.id,
        visit_id=visit3.id,
        evidence_document_id=doc3.id,
        decision="Metformin dosage reduced from 500mg twice daily to 500mg once daily.",
        reason="Improved renal function (eGFR 68 → 82 mL/min). Reduced risk of lactic acidosis.",
        confidence=0.95,
        verification_status="VERIFIED",
    )
    db.add(cd1)

    # Decision 2 — Aspirin added, reason not documented
    cd2 = ClinicalDecision(
        id="cd-002",
        patient_id=patient.id,
        visit_id=visit3.id,
        evidence_document_id=None,
        decision="Aspirin 75mg once daily added to prescription.",
        reason=None,  # Reason not found in available records
        confidence=0.3,
        verification_status="REQUIRES_REVIEW",
    )
    db.add(cd2)

    # Decision 3 — MRI referenced, report missing
    cd3 = ClinicalDecision(
        id="cd-003",
        patient_id=patient.id,
        visit_id=visit3.id,
        evidence_document_id=None,
        decision="Treatment modified based on MRI findings.",
        reason="MRI findings referenced in clinical note but MRI report is not available.",
        confidence=0.1,
        verification_status="REQUIRES_REVIEW",
    )
    db.add(cd3)

    await db.flush()

    # ── CHANGE EVENTS ────────────────────────────────────────────────────────

    # Change 1 — DOCUMENTED (Metformin dose changed, reason found)
    change1 = ChangeEvent(
        id="chg-001",
        patient_id=patient.id,
        previous_visit_id=visit2.id,
        current_visit_id=visit3.id,
        change_type="MEDICATION_CHANGE",
        field_name="Metformin — frequency",
        previous_value="500 mg · Twice daily",
        current_value="500 mg · Once daily",
        reason_status="DOCUMENTED",
        evidence_status="COMPLETE",
        review_status="NOT_REQUIRED",
    )
    db.add(change1)

    # Evidence for change 1
    ev1 = Evidence(
        id="ev-001",
        patient_id=patient.id,
        related_change_id=change1.id,
        document_id=doc3.id,
        evidence_type="CLINICAL_NOTE",
        description=(
            "Clinical note dated 20 Jun 2026 documents reason: "
            "'Metformin dosage reduced due to improved renal function.'"
        ),
        confidence=0.95,
    )
    db.add(ev1)

    # Change 2 — REVIEW NEEDED (Aspirin added, no documented reason)
    change2 = ChangeEvent(
        id="chg-002",
        patient_id=patient.id,
        previous_visit_id=visit2.id,
        current_visit_id=visit3.id,
        change_type="MEDICATION_CHANGE",
        field_name="Aspirin — new prescription",
        previous_value="Not prescribed",
        current_value="Aspirin 75 mg · Once daily",
        reason_status="NOT_DOCUMENTED",
        evidence_status="INCOMPLETE",
        review_status="PENDING",
    )
    db.add(change2)

    # Change 3 — EVIDENCE INCOMPLETE (MRI referenced, report missing)
    change3 = ChangeEvent(
        id="chg-003",
        patient_id=patient.id,
        previous_visit_id=visit2.id,
        current_visit_id=visit3.id,
        change_type="TREATMENT_CHANGE",
        field_name="MRI-referenced treatment modification",
        previous_value="No imaging on record",
        current_value="Treatment modified — MRI report referenced but not available",
        reason_status="UNKNOWN",
        evidence_status="INCOMPLETE",
        review_status="PENDING",
    )
    db.add(change3)

    await db.flush()

    # ── DECISION MEMORY ──────────────────────────────────────────────────────
    dm1 = DecisionMemory(
        id="dm-001",
        patient_id=patient.id,
        source_visit_id=visit3.id,
        finding="Kidney function improved: eGFR rose from 68 to 82 mL/min between Jan 2026 and Jun 2026.",
        decision="Metformin dosage reduced from 500mg twice daily to 500mg once daily.",
        reason="Improved renal function reduces the risk of lactic acidosis associated with higher Metformin doses.",
        evidence="Clinical Note — 20 Jun 2026 · Lab Report — 20 Jun 2026 (eGFR 82)",
        follow_up="Repeat HbA1c and renal panel in 3 months. Monitor for glycaemic control at lower dose.",
        verification_status="VERIFIED",
    )
    db.add(dm1)

    await db.flush()

    print("  [OK] Change events created (3 events: documented, review needed, incomplete)")
    print("  [OK] Evidence created for documented change")
    print("  [OK] Decision memory created (1 verified chain)")
    print("  [OK] Clinical decisions created (3 decisions)")
    print()
    print("[DONE] Seed complete!")
    print(f"   Patient ID : {patient.id}")
    print(f"   UHID       : {patient.uhid}")
    print(f"   Visits     : 3 (Jan 2026, Mar 2026, Jun 2026)")
    print(f"   Documents  : 4 (note: MRI report intentionally absent)")
    print(f"   Medications: 4 (2 historical, 2 current)")
    print(f"   Lab results: 7")
    print(f"   Changes    : 3 (documented / review / incomplete)")
    print(f"   Decisions  : 3")
    print(f"   Memory     : 1 verified chain")
    print()
    print("   Try: GET http://localhost:8000/api/patients/pat-ramesh-001")
    print("   Try: GET http://localhost:8000/api/patients/pat-ramesh-001/summary")
    print("   Docs: http://localhost:8000/api/docs")


async def seed_doctor(db: AsyncSession) -> None:
    from sqlalchemy import select
    res = await db.execute(select(Doctor).where(Doctor.email == "ananya.sharma@continuumhealth.in"))
    existing_doc = res.scalar_one_or_none()
    if not existing_doc:
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
        print("  [OK] Doctor account created: Dr. Ananya Sharma (ananya.sharma@continuumhealth.in / demo1234)")
    else:
        print("  [INFO] Doctor 'ananya.sharma@continuumhealth.in' already exists.")


async def main() -> None:
    await create_all_tables()
    async with AsyncSessionLocal() as db:
        await seed_doctor(db)

        # Check if already seeded
        from sqlalchemy import select
        result = await db.execute(
            select(Patient).where(Patient.id == "pat-ramesh-001")
        )
        existing = result.scalar_one_or_none()
        if existing:
            print("[INFO] Database already seeded. Patient 'pat-ramesh-001' exists.")
            return

        try:
            await seed(db)
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"[ERROR] Seed failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
