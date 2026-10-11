"""
HealthContinuum AI — Change Event Routes
GET /api/patients/{patient_id}/changes
GET /api/changes/{change_id}
GET /api/changes/{change_id}/evidence
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, ChangeEventOut, EvidenceOut
from app.services import change_service, patient_service

router = APIRouter(tags=["changes"])


@router.get(
    "/patients/{patient_id}/changes",
    response_model=APIResponse[list[ChangeEventOut]],
)
async def list_changes(
    patient_id: str,
    review_status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            404, detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"}
        )
    changes = await change_service.get_changes_for_patient(
        db, patient_id, review_status=review_status, skip=skip, limit=limit
    )
    return APIResponse(
        success=True,
        data=[ChangeEventOut.model_validate(c) for c in changes],
        message=f"{len(changes)} change events found",
    )


@router.get("/changes/{change_id}", response_model=APIResponse[ChangeEventOut])
async def get_change(
    change_id: str,
    db: AsyncSession = Depends(get_db),
):
    change = await change_service.get_change_by_id(db, change_id)
    if not change:
        raise HTTPException(
            404, detail={"code": "CHANGE_NOT_FOUND", "message": "Change event not found"}
        )
    return APIResponse(
        success=True,
        data=ChangeEventOut.model_validate(change),
        message="Change event retrieved successfully",
    )


@router.get(
    "/changes/{change_id}/evidence",
    response_model=APIResponse[list[EvidenceOut]],
)
async def get_evidence_for_change(
    change_id: str,
    db: AsyncSession = Depends(get_db),
):
    change = await change_service.get_change_by_id(db, change_id)
    if not change:
        raise HTTPException(
            404, detail={"code": "CHANGE_NOT_FOUND", "message": "Change event not found"}
        )
    evidences = await change_service.get_evidence_for_change(db, change_id)
    return APIResponse(
        success=True,
        data=[EvidenceOut.model_validate(e) for e in evidences],
        message=f"{len(evidences)} evidence items found",
    )
