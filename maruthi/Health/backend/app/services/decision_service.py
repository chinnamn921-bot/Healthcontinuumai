"""
HealthContinuum AI — Decision Memory Service
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.decision_memory import DecisionMemory


async def get_decision_memory_for_patient(
    db: AsyncSession, patient_id: str, skip: int = 0, limit: int = 50
) -> list[DecisionMemory]:
    result = await db.execute(
        select(DecisionMemory)
        .where(DecisionMemory.patient_id == patient_id)
        .order_by(DecisionMemory.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all())
