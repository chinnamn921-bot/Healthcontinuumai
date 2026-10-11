"""
HealthContinuum AI — Change Event Model

A ChangeEvent captures a meaningful difference detected between two visits.
This is the core data structure for the Continuity Engine (Phase 2).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class ChangeEvent(Base):
    __tablename__ = "change_events"
    __table_args__ = (
        Index("ix_change_events_patient_id", "patient_id"),
        Index("ix_change_events_review_status", "review_status"),
        Index("ix_change_events_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    previous_visit_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )
    current_visit_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )

    change_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # MEDICATION_CHANGE | LAB_VALUE_CHANGE | DIAGNOSIS_CHANGE | TREATMENT_CHANGE | OTHER

    field_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    reason_status: Mapped[str] = mapped_column(
        String(20), default="UNKNOWN", nullable=False
    )
    # DOCUMENTED | NOT_DOCUMENTED | UNKNOWN

    evidence_status: Mapped[str] = mapped_column(
        String(20), default="UNKNOWN", nullable=False
    )
    # COMPLETE | INCOMPLETE | UNKNOWN

    review_status: Mapped[str] = mapped_column(
        String(20), default="NOT_REQUIRED", nullable=False
    )
    # NOT_REQUIRED | PENDING | RESOLVED

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # ── Relationships ────────────────────────────────────────────────────────
    patient: Mapped["Patient"] = relationship("Patient", back_populates="change_events")  # noqa: F821
    evidences: Mapped[list["Evidence"]] = relationship(  # noqa: F821
        "Evidence", back_populates="change_event", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<ChangeEvent id={self.id!r} type={self.change_type!r} "
            f"reason={self.reason_status!r} evidence={self.evidence_status!r}>"
        )
