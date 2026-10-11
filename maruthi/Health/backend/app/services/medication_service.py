"""
HealthContinuum AI — Medication Service
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.medication import Medication
from app.schemas.schemas import MedicationCreate


async def get_medications_for_patient(
    db: AsyncSession,
    patient_id: str,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Medication]:
    q = select(Medication).where(Medication.patient_id == patient_id)
    if status:
        q = q.where(Medication.status == status.upper())
    q = q.order_by(Medication.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_medication_by_id(db: AsyncSession, med_id: str) -> Medication | None:
    result = await db.execute(select(Medication).where(Medication.id == med_id))
    return result.scalar_one_or_none()


async def create_medication(
    db: AsyncSession, patient_id: str, data: MedicationCreate
) -> Medication:
    med = Medication(patient_id=patient_id, **data.model_dump())
    db.add(med)
    await db.flush()
    await db.refresh(med)
    return med
