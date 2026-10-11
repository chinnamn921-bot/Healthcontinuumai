"""
HealthContinuum AI — Patient Service
All business logic for patient CRUD operations.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.schemas.schemas import PatientCreate, PatientUpdate


async def get_patient_by_id(db: AsyncSession, patient_id: str) -> Patient | None:
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    return result.scalar_one_or_none()


async def get_patient_by_uhid(db: AsyncSession, uhid: str) -> Patient | None:
    result = await db.execute(select(Patient).where(Patient.uhid == uhid))
    return result.scalar_one_or_none()


async def get_all_patients(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Patient]:
    result = await db.execute(select(Patient).offset(skip).limit(limit))
    return list(result.scalars().all())


async def create_patient(db: AsyncSession, data: PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient


async def update_patient(
    db: AsyncSession, patient: Patient, data: PatientUpdate
) -> Patient:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(patient, key, value)
    await db.flush()
    await db.refresh(patient)
    return patient
