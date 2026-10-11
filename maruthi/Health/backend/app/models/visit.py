"""
HealthContinuum AI — Visit Model
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


class Visit(Base):
    __tablename__ = "visits"
    __table_args__ = (
        Index("ix_visits_patient_id", "patient_id"),
        Index("ix_visits_visit_date", "visit_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    patient_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    visit_date: Mapped[str] = mapped_column(String(20), nullable=False)
    hospital_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    visit_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    # ── Relationships ────────────────────────────────────────────────────────
    patient: Mapped["Patient"] = relationship("Patient", back_populates="visits")  # noqa: F821
    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document", back_populates="visit", cascade="all, delete-orphan"
    )
    medications: Mapped[list["Medication"]] = relationship(  # noqa: F821
        "Medication", back_populates="visit", cascade="all, delete-orphan"
    )
    lab_results: Mapped[list["LabResult"]] = relationship(  # noqa: F821
        "LabResult", back_populates="visit", cascade="all, delete-orphan"
    )
    clinical_decisions: Mapped[list["ClinicalDecision"]] = relationship(  # noqa: F821
        "ClinicalDecision", back_populates="visit", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Visit id={self.id!r} date={self.visit_date!r}>"
