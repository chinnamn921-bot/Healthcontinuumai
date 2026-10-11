"""
HealthContinuum AI — Production Document Intelligence & Extraction Test Suite
Verifies genuine document upload, classification, field extraction, uncertainty flagging,
persistence, review confirmation, and companion retrieval without false demo fallbacks.
"""
from __future__ import annotations

import io
import json
import pytest
import reportlab.pdfgen.canvas as canvas
from httpx import AsyncClient

from app.models.patient import Patient
from tests.conftest import TestSessionLocal


@pytest.fixture(autouse=True)
async def seed_test_patient():
    """Ensure test patient pat-ramesh-001 exists in database."""
    async with TestSessionLocal() as session:
        pat = await session.get(Patient, "pat-ramesh-001")
        if not pat:
            pat = Patient(
                id="pat-ramesh-001",
                name="Ramesh Kumar",
                date_of_birth="1984-03-12",
                gender="MALE",
                blood_group="B+",
                phone="+91 98765 43210",
                email="ramesh.kumar@synthetic.example",
                uhid="HC-2024-00847",
            )
            session.add(pat)
            await session.commit()


def create_sample_pdf(lines: list[str]) -> bytes:
    """Helper to generate a real PDF in memory with custom text."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    y = 750
    for line in lines:
        c.drawString(50, y, line)
        y -= 25
    c.save()
    return buf.getvalue()


@pytest.mark.asyncio
async def test_a_lab_report_extraction(client: AsyncClient):
    """
    TEST A — Lab report:
    Upload a report containing readable tables.
    Verify that extracted test names, values, units, and reference ranges match the source.
    """
    lab_pdf_bytes = create_sample_pdf([
        "Apex Clinical Laboratories & Diagnostics",
        "Patient Name: Ramesh Kumar   Date: 2026-06-25",
        "Test Name             Result    Unit      Reference Range",
        "HbA1c                 6.8       %         < 7.0",
        "Fasting Blood Glucose 95        mg/dL     70 - 99",
        "Serum Creatinine      1.05      mg/dL     0.7 - 1.2",
        "eGFR                  78        mL/min/1.73m² > 60",
    ])

    files = {"file": ("apex_lab_panel.pdf", lab_pdf_bytes, "application/pdf")}
    res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files=files,
        data={"document_type": "LAB_REPORT"},
    )
    assert res.status_code == 201
    json_data = res.json()
    assert json_data["success"] is True

    doc_data = json_data["data"]
    assert doc_data["document_type"] == "LAB_REPORT"
    assert doc_data["file_name"] == "apex_lab_panel.pdf"
    assert doc_data["confidence_score"] >= 0.70

    parsed = doc_data["parsed_data"]
    results = parsed["results"]
    assert len(results) >= 3

    # Verify specific extracted tests
    test_names = [r["test_name"]["value"].lower() for r in results]
    assert any("hba1c" in t for t in test_names)
    assert any("glucose" in t for t in test_names)
    assert any("creatinine" in t for t in test_names)

    # Check values match source exactly
    hba1c = next(r for r in results if "hba1c" in r["test_name"]["value"].lower())
    assert hba1c["result"]["value"] == "6.8"
    assert hba1c["unit"]["value"] == "%"
    assert hba1c["reference_range"]["value"] == "< 7.0"
    assert hba1c["abnormal_flag"] == "NORMAL"


@pytest.mark.asyncio
async def test_b_prescription_extraction_with_uncertainty(client: AsyncClient):
    """
    TEST B — Prescription extraction:
    Upload a prescription containing legible drugs and incomplete/handwritten instructions.
    Verify readable fields are extracted and uncertain dosage fields remain unresolved.
    """
    rx_pdf_bytes = create_sample_pdf([
        "City Health Clinic — Prescription",
        "Dr. Sharma, MD   Date: 2026-07-01",
        "Patient: Ramesh Kumar",
        "Rx:",
        "1. Metformin 500 mg   Sig: Twice daily after meals",
        "2. Atorvastatin 20 mg Sig: Once daily at bedtime",
        "3. Pantoprazole 40 mg Sig: Once daily before food",
        "4. Gliclazide         Sig: [illegible handwritten scrawl]",
    ])

    files = {"file": ("rx_clinic_july.pdf", rx_pdf_bytes, "application/pdf")}
    res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files=files,
        data={"document_type": "PRESCRIPTION"},
    )
    assert res.status_code == 201
    doc_data = res.json()["data"]
    assert doc_data["document_type"] == "PRESCRIPTION"

    parsed = doc_data["parsed_data"]
    meds = parsed["medications"]
    assert len(meds) >= 3

    # Check Metformin
    met = next(m for m in meds if "metformin" in m["name"]["value"].lower())
    assert met["dosage"]["value"] == "500 mg"
    assert met["dosage"]["status"] == "extracted"
    assert met["frequency"]["status"] == "extracted"

    # Check Gliclazide has unreadable/missing frequency and is flagged with uncertainty
    glic = next((m for m in meds if "gliclazide" in m["name"]["value"].lower()), None)
    if glic:
        assert glic["frequency"]["status"] == "missing"
        assert glic["uncertainty_flag"] is True

    # Verify review issues include warnings for uncertain fields
    assert any("uncertain" in iss["issue"].lower() or "not fully legible" in iss["issue"].lower() for iss in parsed["review_issues"])


@pytest.mark.asyncio
async def test_c_receipt_extraction_separate_from_clinical(client: AsyncClient):
    """
    TEST C — Medical receipt:
    Upload a medical receipt/bill. Verify business name, invoice number, items, and total
    are extracted and NOT classified as prescription medications.
    """
    bill_pdf_bytes = create_sample_pdf([
        "Apollo Pharmacy & Medical Supplies",
        "Tax Invoice / Cash Receipt",
        "Invoice No: INV-99824   Date: 2026-07-02",
        "Item Description           Qty   Amount",
        "BP Monitor Cuff            1     ₹ 1200.00",
        "Glucometer Test Strips     2     ₹ 850.00",
        "Subtotal: ₹ 2050.00",
        "GST 18%: ₹ 369.00",
        "Total Amount: ₹ 2419.00",
        "Payment Mode: Credit Card (PAID)",
    ])

    files = {"file": ("pharmacy_receipt.pdf", bill_pdf_bytes, "application/pdf")}
    res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files=files,
    )
    assert res.status_code == 201
    doc_data = res.json()["data"]
    assert doc_data["document_type"] == "RECEIPT"

    parsed = doc_data["parsed_data"]
    assert parsed["document_type"] == "RECEIPT"
    assert parsed["invoice_number"]["value"] == "INV-99824"
    assert parsed["total_amount"]["value"] == "2419.00"
    assert len(parsed["items"]) >= 2


@pytest.mark.asyncio
async def test_d_missing_values_marked_missing(client: AsyncClient):
    """
    TEST E — Missing values:
    Verify absent fields are marked 'missing' rather than being invented or hallucinated.
    """
    minimal_pdf_bytes = create_sample_pdf([
        "Brief Lab Note",
        "Serum Potassium: 4.2",
    ])

    files = {"file": ("minimal_note.pdf", minimal_pdf_bytes, "application/pdf")}
    res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files=files,
        data={"document_type": "LAB_REPORT"},
    )
    assert res.status_code == 201
    doc_data = res.json()["data"]
    parsed = doc_data["parsed_data"]

    # Patient name was absent in PDF -> must be status "missing" and value None
    assert parsed["patient_name"]["status"] == "missing"
    assert parsed["patient_name"]["value"] is None


@pytest.mark.asyncio
async def test_e_document_review_and_database_persistence(client: AsyncClient):
    """
    TEST F — Review & Confirmation:
    User reviews extracted fields, corrects an item, and submits review.
    Verify that confirmed medications and lab results are promoted to the database.
    """
    rx_bytes = create_sample_pdf([
        "Prescription Note",
        "Patient: Ramesh Kumar",
        "Rx: Lisinopril 10 mg once daily",
    ])
    upload_res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files={"file": ("rx_lisinopril.pdf", rx_bytes, "application/pdf")},
        data={"document_type": "PRESCRIPTION"},
    )
    doc_id = upload_res.json()["data"]["id"]

    # Submit review with corrected frequency and verified title
    review_payload = {
        "status": "VERIFIED",
        "document_type": "PRESCRIPTION",
        "document_title": "Confirmed Cardiology Prescription",
        "document_date": "2026-07-05",
        "hospital_name": "City Care Hospital",
        "patient_name": "Ramesh Kumar",
        "medications": [
            {
                "name": "Lisinopril",
                "dosage": "10 mg",
                "frequency": "Once daily (morning with water)",
                "route": "Oral",
                "status": "CURRENT",
            }
        ],
        "lab_results": [],
    }

    review_res = await client.post(f"/api/documents/{doc_id}/review", json=review_payload)
    assert review_res.status_code == 200
    reviewed_doc = review_res.json()["data"]
    assert reviewed_doc["review_status"] == "VERIFIED"
    assert reviewed_doc["processing_status"] == "PROCESSED"

    # Verify document retrieval retains reviewed status
    get_res = await client.get(f"/api/documents/{doc_id}")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["review_status"] == "VERIFIED"

    # Verify patient medications list now includes the promoted Lisinopril
    meds_res = await client.get("/api/patients/pat-ramesh-001/medications")
    assert meds_res.status_code == 200
    med_names = [m["name"].lower() for m in meds_res.json()["data"]]
    assert "lisinopril" in med_names


@pytest.mark.asyncio
async def test_f_file_serving_endpoint(client: AsyncClient):
    """
    TEST G — File Serving:
    Ensure GET /api/documents/{id}/file retrieves the original uploaded binary file.
    """
    pdf_bytes = create_sample_pdf(["Original Diagnostic Certificate #88192"])
    upload_res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files={"file": ("certificate.pdf", pdf_bytes, "application/pdf")},
    )
    doc_id = upload_res.json()["data"]["id"]

    file_res = await client.get(f"/api/documents/{doc_id}/file")
    assert file_res.status_code == 200
    assert file_res.headers["content-type"] == "application/pdf"
    assert len(file_res.content) > 0


@pytest.mark.asyncio
async def test_g_ai_companion_retrieves_uploaded_document(client: AsyncClient):
    """
    TEST J — AI Companion:
    Ask about an uploaded document and verify the response references the genuine uploaded file.
    """
    test_pdf = create_sample_pdf([
        "Thyroid Function Profile — Lab Report",
        "Patient: Ramesh Kumar",
        "Date: 2026-07-10",
        "TSH (Ultrasensitive) 2.45 µIU/mL (Ref: 0.4 - 4.2)",
    ])
    upload_res = await client.post(
        "/api/patients/pat-ramesh-001/documents/upload",
        files={"file": ("thyroid_panel_july.pdf", test_pdf, "application/pdf")},
        data={"document_type": "LAB_REPORT"},
    )
    assert upload_res.status_code == 201

    # Ask the companion about the uploaded document
    chat_res = await client.post(
        "/api/patients/pat-ramesh-001/companion/chat",
        json={"query": "What is in my latest uploaded document?"},
    )
    assert chat_res.status_code == 200
    chat_data = chat_res.json()["data"]

    # Verify companion response cites or mentions the uploaded document
    assert chat_data["safety_status"] == "SAFE"
    answer_text = chat_data["answer"].lower()
    assert "thyroid_panel_july.pdf" in answer_text or "tsh" in answer_text or "lab_report" in answer_text
