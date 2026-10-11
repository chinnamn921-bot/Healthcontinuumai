"""
HealthContinuum AI — Change Event Service

Foundation for the Continuity Engine (Phase 2).
Current: CRUD for manually-seeded change events.
Future: will be called by the engine that compares visits automatically.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.change_event import ChangeEvent
from app.models.evidence import Evidence


async def get_changes_for_patient(
    db: AsyncSession,
    patient_id: str,
    review_status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[ChangeEvent]:
    q = select(ChangeEvent).where(ChangeEvent.patient_id == patient_id)
    if review_status:
        q = q.where(ChangeEvent.review_status == review_status.upper())
    q = q.order_by(ChangeEvent.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def get_change_by_id(db: AsyncSession, change_id: str) -> ChangeEvent | None:
    result = await db.execute(
        select(ChangeEvent).where(ChangeEvent.id == change_id)
    )
    return result.scalar_one_or_none()


async def get_evidence_for_change(
    db: AsyncSession, change_id: str
) -> list[Evidence]:
    result = await db.execute(
        select(Evidence).where(Evidence.related_change_id == change_id)
    )
    return list(result.scalars().all())


async def count_unresolved_changes(db: AsyncSession, patient_id: str) -> int:
    """Used by the home screen summary."""
    result = await db.execute(
        select(ChangeEvent).where(
            ChangeEvent.patient_id == patient_id,
            ChangeEvent.review_status == "PENDING",
        )
    )
    return len(result.scalars().all())
