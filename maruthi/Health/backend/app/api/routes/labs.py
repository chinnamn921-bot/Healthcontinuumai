"""
HealthContinuum AI — Lab Routes
GET /api/patients/{patient_id}/labs
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, LabResultOut
from app.services import lab_service, patient_service

router = APIRouter(prefix="/patients", tags=["labs"])


@router.get("/{patient_id}/labs", response_model=APIResponse[list[LabResultOut]])
async def list_labs(
    patient_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            404, detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"}
        )
    labs = await lab_service.get_labs_for_patient(db, patient_id, skip=skip, limit=limit)
    return APIResponse(
        success=True,
        data=[LabResultOut.model_validate(l) for l in labs],
        message=f"{len(labs)} lab results found",
    )
