"""
HealthContinuum AI — Clinical Decision Model
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class ClinicalDecision(Base):
    __tablename__ = "clinical_decisions"
    __table_args__ = (
        Index("ix_clinical_decisions_patient_id", "patient_id"),
        Index("ix_clinical_decisions_verification_status", "verification_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    visit_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )
    evidence_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )

    decision: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    verification_status: Mapped[str] = mapped_column(
        String(20), default="PENDING", nullable=False
    )
    # PENDING | VERIFIED | REQUIRES_REVIEW

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # ── Relationships ────────────────────────────────────────────────────────
    patient: Mapped["Patient"] = relationship("Patient", back_populates="clinical_decisions")  # noqa: F821
    visit: Mapped["Visit | None"] = relationship("Visit", back_populates="clinical_decisions")  # noqa: F821

    def __repr__(self) -> str:
        return f"<ClinicalDecision id={self.id!r} status={self.verification_status!r}>"
