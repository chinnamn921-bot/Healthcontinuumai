"""
HealthContinuum AI — Medication Routes
GET /api/patients/{patient_id}/medications
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, MedicationOut
from app.services import medication_service, patient_service

router = APIRouter(prefix="/patients", tags=["medications"])


@router.get("/{patient_id}/medications", response_model=APIResponse[list[MedicationOut]])
async def list_medications(
    patient_id: str,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(404, detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"})

    meds = await medication_service.get_medications_for_patient(
        db, patient_id, status=status, skip=skip, limit=limit
    )
    return APIResponse(
        success=True,
        data=[MedicationOut.model_validate(m) for m in meds],
        message=f"{len(meds)} medications found",
    )
