"""
HealthContinuum AI — Clinical Decision Routes
GET /api/patients/{patient_id}/decisions
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.models.clinical_decision import ClinicalDecision
from app.schemas.schemas import APIResponse, ClinicalDecisionOut
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["decisions"])


@router.get(
    "/{patient_id}/decisions",
    response_model=APIResponse[list[ClinicalDecisionOut]],
)
async def list_decisions(
    patient_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            404, detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"}
        )
    result = await db.execute(
        select(ClinicalDecision)
        .where(ClinicalDecision.patient_id == patient_id)
        .order_by(ClinicalDecision.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    decisions = list(result.scalars().all())
    return APIResponse(
        success=True,
        data=[ClinicalDecisionOut.model_validate(d) for d in decisions],
        message=f"{len(decisions)} clinical decisions found",
    )
