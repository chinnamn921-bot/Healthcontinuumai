"""
HealthContinuum AI — Decision Memory Routes
GET /api/patients/{patient_id}/decision-memory
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, DecisionMemoryOut
from app.services import decision_service, patient_service

router = APIRouter(prefix="/patients", tags=["decision-memory"])


@router.get(
    "/{patient_id}/decision-memory",
    response_model=APIResponse[list[DecisionMemoryOut]],
)
async def list_decision_memory(
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
    memories = await decision_service.get_decision_memory_for_patient(
        db, patient_id, skip=skip, limit=limit
    )
    return APIResponse(
        success=True,
        data=[DecisionMemoryOut.model_validate(m) for m in memories],
        message=f"{len(memories)} decision memories found",
    )
