"""
HealthContinuum AI — Health Summary Route
GET /api/patients/{patient_id}/summary
Used by the Home screen to fetch everything in one call.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.schemas.schemas import APIResponse, HealthSummary, PatientOut, VisitOut
from app.services import (
    change_service,
    medication_service,
    patient_service,
    visit_service,
)

router = APIRouter(prefix="/patients", tags=["summary"])


@router.get("/{patient_id}/summary", response_model=APIResponse[HealthSummary])
async def get_health_summary(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
):
    patient = await patient_service.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            404, detail={"code": "PATIENT_NOT_FOUND", "message": "Patient not found"}
        )

    visits = await visit_service.get_visits_for_patient(db, patient_id, limit=10)
    latest_visit = visits[0] if visits else None

    unresolved = await change_service.count_unresolved_changes(db, patient_id)

    # Recent activity: last 5 visits formatted
    recent_activity = [
        {
            "type": "visit",
            "title": v.visit_type or "Visit",
            "subtitle": v.hospital_name or "",
            "date": v.visit_date,
        }
        for v in visits[:5]
    ]

    summary = HealthSummary(
        patient=PatientOut.model_validate(patient),
        total_visits=len(visits),
        latest_visit=VisitOut.model_validate(latest_visit) if latest_visit else None,
        unresolved_changes=unresolved,
        pending_review=unresolved,
        recent_activity=recent_activity,
    )
    return APIResponse(
        success=True,
        data=summary,
        message="Health summary retrieved successfully",
    )
