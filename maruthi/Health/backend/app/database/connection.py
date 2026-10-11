"""
HealthContinuum AI — Database Connection
Async SQLAlchemy engine + session factory.
Supports SQLite (dev) and PostgreSQL (production) via DATABASE_URL.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────
# SQLite needs check_same_thread=False; PostgreSQL ignores this kwarg.
connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args=connect_args,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Declarative base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency ────────────────────────────────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency — yields a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Table creation ────────────────────────────────────────────────────────────
async def create_all_tables() -> None:
    """Create all tables that don't yet exist. Called on startup."""
    async with engine.begin() as conn:
        from app.models import (  # noqa: F401 – imports needed to register mappers
            change_event,
            clinical_decision,
            decision_memory,
            document,
            doctor_access,
            evidence,
            lab_result,
            medication,
            patient,
            visit,
            conversation,
        )
        await conn.run_sync(Base.metadata.create_all)
