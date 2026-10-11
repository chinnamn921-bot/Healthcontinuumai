"""
HealthContinuum AI — Visit Service
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visit import Visit
from app.schemas.schemas import VisitCreate


async def get_visits_for_patient(
    db: AsyncSession, patient_id: str, skip: int = 0, limit: int = 100
) -> list[Visit]:
    result = await db.execute(
        select(Visit)
        .where(Visit.patient_id == patient_id)
        .order_by(Visit.visit_date.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_visit_by_id(db: AsyncSession, visit_id: str) -> Visit | None:
    result = await db.execute(select(Visit).where(Visit.id == visit_id))
    return result.scalar_one_or_none()


async def create_visit(db: AsyncSession, patient_id: str, data: VisitCreate) -> Visit:
    visit = Visit(patient_id=patient_id, **data.model_dump())
    db.add(visit)
    await db.flush()
    await db.refresh(visit)
    return visit
