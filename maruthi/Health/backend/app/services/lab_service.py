"""
HealthContinuum AI — Lab Service
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lab_result import LabResult
from app.schemas.schemas import LabResultCreate


async def get_labs_for_patient(
    db: AsyncSession, patient_id: str, skip: int = 0, limit: int = 100
) -> list[LabResult]:
    result = await db.execute(
        select(LabResult)
        .where(LabResult.patient_id == patient_id)
        .order_by(LabResult.test_date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def create_lab_result(
    db: AsyncSession, patient_id: str, data: LabResultCreate
) -> LabResult:
    lab = LabResult(patient_id=patient_id, **data.model_dump())
    db.add(lab)
    await db.flush()
    await db.refresh(lab)
    return lab
