"""
HealthContinuum AI — Visit Routes
GET /api/patients/{patient_id}/visits
POST /api/patients/{patient_id}/visits
GET /api/patients/{patient_id}/visits/{visit_id}
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, VisitCreate, VisitOut
from app.services import patient_service, visit_service

router = APIRouter(prefix="/patients", tags=["visits"])


@router.get("/{patient_id}/visits", response_model=APIResponse[list[VisitOut]])
async def list_visits(
    patient_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"},
        )
    visits = await visit_service.get_visits_for_patient(db, patient_id, skip, limit)
    return APIResponse(
        success=True,
        data=[VisitOut.model_validate(v) for v in visits],
        message=f"{len(visits)} visits found",
    )


@router.post(
    "/{patient_id}/visits",
    response_model=APIResponse[VisitOut],
    status_code=status.HTTP_201_CREATED,
)
async def create_visit(
    patient_id: str,
    payload: VisitCreate,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"},
        )
    visit = await visit_service.create_visit(db, patient_id, payload)
    return APIResponse(
        success=True,
        data=VisitOut.model_validate(visit),
        message="Visit created successfully",
    )


@router.get("/{patient_id}/visits/{visit_id}", response_model=APIResponse[VisitOut])
async def get_visit(
    patient_id: str,
    visit_id: str,
    db: AsyncSession = Depends(get_db),
):
    visit = await visit_service.get_visit_by_id(db, visit_id)
    if not visit or visit.patient_id != patient_id:
        raise HTTPException(
            status_code=404,
            detail={"code": "VISIT_NOT_FOUND", "message": "Visit not found"},
        )
    return APIResponse(
        success=True,
        data=VisitOut.model_validate(visit),
        message="Visit retrieved successfully",
    )
