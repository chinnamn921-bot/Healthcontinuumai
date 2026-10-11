"""
HealthContinuum AI — Authentication Routes
POST /api/auth/login
POST /api/auth/register
POST /api/auth/google
GET  /api/auth/me
"""
from __future__ import annotations

import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import get_db
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.core.security import create_access_token, decode_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email, Phone, UHID, or Patient ID")
    password: str = Field(default="", description="Password")
    remember_me: bool = Field(default=True)


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str | None = None
    phone: str | None = None
    password: str = Field(default="password123")


class GoogleAuthRequest(BaseModel):
    email: str
    name: str
    google_id: str | None = None


class AuthData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    patient: dict[str, Any]


class AuthResponse(BaseModel):
    success: bool
    data: AuthData | None = None
    message: str | None = None


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    identifier = payload.identifier.strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_IDENTIFIER", "message": "Email or mobile number is required."},
        )

    # Search for matching patient by email, phone, UHID, or ID
    stmt = select(Patient).where(
        or_(
            Patient.email.ilike(identifier),
            Patient.phone == identifier,
            Patient.uhid.ilike(identifier),
            Patient.id == identifier,
        )
    )
    result = await db.execute(stmt)
    patient = result.scalars().first()

    # If not found directly in database
    if not patient:
        # Check if explicitly requesting demo patient
        if identifier.lower() in ("pat-ramesh-001", "hc-2024-00847", "ramesh", "ramesh.kumar@synthetic.example"):
            demo_stmt = select(Patient).where(Patient.id == "pat-ramesh-001")
            demo_res = await db.execute(demo_stmt)
            patient = demo_res.scalars().first()
        else:
            # Auto-create new personalized patient account for this new email / user
            new_id = f"pat-{uuid.uuid4().hex[:8]}"
            new_uhid = f"HC-{uuid.uuid4().hex[:6].upper()}"
            name_part = (
                identifier.split("@")[0].replace(".", " ").replace("_", " ").title()
                if "@" in identifier
                else f"Patient {identifier[-4:] if len(identifier) >= 4 else identifier}"
            )
            patient = Patient(
                id=new_id,
                name=name_part,
                email=identifier if "@" in identifier else None,
                phone=identifier if "@" not in identifier else None,
                uhid=new_uhid,
            )
            db.add(patient)
            await db.commit()
            await db.refresh(patient)

    token_data = {
        "sub": patient.id,
        "name": patient.name,
        "email": patient.email,
        "uhid": patient.uhid,
    }
    access_token = create_access_token(token_data)

    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "uhid": patient.uhid,
        "blood_group": patient.blood_group,
        "gender": patient.gender,
        "date_of_birth": patient.date_of_birth,
    }

    return AuthResponse(
        success=True,
        data=AuthData(
            access_token=access_token,
            token_type="bearer",
            patient=patient_dict,
        ),
        message=f"Welcome back, {patient.name}!",
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    patient_id = f"pat-{uuid.uuid4().hex[:8]}"
    uhid = f"HC-{uuid.uuid4().hex[:6].upper()}"

    new_patient = Patient(
        id=patient_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        uhid=uhid,
    )
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)

    access_token = create_access_token({"sub": new_patient.id, "name": new_patient.name})

    patient_dict = {
        "id": new_patient.id,
        "name": new_patient.name,
        "email": new_patient.email,
        "phone": new_patient.phone,
        "uhid": new_patient.uhid,
    }

    return AuthResponse(
        success=True,
        data=AuthData(
            access_token=access_token,
            token_type="bearer",
            patient=patient_dict,
        ),
        message=f"Account created successfully for {new_patient.name}.",
    )


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).where(Patient.email.ilike(payload.email))
    result = await db.execute(stmt)
    patient = result.scalars().first()

    if not patient:
        if payload.email.lower() == "ramesh.kumar@synthetic.example":
            demo_stmt = select(Patient).where(Patient.id == "pat-ramesh-001")
            demo_res = await db.execute(demo_stmt)
            patient = demo_res.scalars().first()
        else:
            new_id = f"pat-{uuid.uuid4().hex[:8]}"
            new_uhid = f"HC-{uuid.uuid4().hex[:6].upper()}"
            patient = Patient(
                id=new_id,
                name=payload.name or payload.email.split("@")[0].title(),
                email=payload.email,
                uhid=new_uhid,
            )
            db.add(patient)
            await db.commit()
            await db.refresh(patient)

    access_token = create_access_token({"sub": patient.id, "name": patient.name, "email": patient.email})

    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "email": patient.email,
        "phone": patient.phone,
        "uhid": patient.uhid,
    }

    return AuthResponse(
        success=True,
        data=AuthData(
            access_token=access_token,
            token_type="bearer",
            patient=patient_dict,
        ),
        message=f"Signed in as {patient.name}",
    )


@router.get("/me", response_model=AuthResponse)
async def get_current_user(
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    if not token:
        # Return default patient
        stmt = select(Patient).where(Patient.id == "pat-ramesh-001")
        res = await db.execute(stmt)
        patient = res.scalars().first()
    else:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(status_code=401, detail="Invalid token")
        stmt = select(Patient).where(Patient.id == payload["sub"])
        res = await db.execute(stmt)
        patient = res.scalars().first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return AuthResponse(
        success=True,
        data=AuthData(
            access_token=token or "",
            token_type="bearer",
            patient={
                "id": patient.id,
                "name": patient.name,
                "email": patient.email,
                "phone": patient.phone,
                "uhid": patient.uhid,
            },
        ),
    )


# ── DOCTOR AUTHENTICATION ─────────────────────────────────────────────────────

class DoctorLoginRequest(BaseModel):
    email: str = Field(..., description="Doctor email")
    password: str = Field(..., description="Doctor password")


class DoctorProfileOut(BaseModel):
    id: str
    fullName: str
    credentials: str
    registrationNumber: str
    specialty: str
    facilityName: str
    facilityId: str | None = None
    avatarInitials: str
    email: str
    verified: bool


class DoctorAuthData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    doctor: DoctorProfileOut


class DoctorAuthResponse(BaseModel):
    success: bool
    data: DoctorAuthData | None = None
    message: str | None = None


@router.post("/doctor/login", response_model=DoctorAuthResponse)
async def doctor_login(
    payload: DoctorLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()
    stmt = select(Doctor).where(Doctor.email.ilike(email))
    res = await db.execute(stmt)
    doctor = res.scalar_one_or_none()
    if not doctor or not doctor.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid doctor email or password."},
        )

    if not verify_password(payload.password, doctor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid doctor email or password."},
        )

    token = create_access_token({
        "sub": doctor.id,
        "email": doctor.email,
        "name": doctor.full_name,
        "role": "doctor",
    })

    profile = DoctorProfileOut(
        id=doctor.id,
        fullName=doctor.full_name,
        credentials=doctor.credentials,
        registrationNumber=doctor.registration_number,
        specialty=doctor.specialty,
        facilityName=doctor.facility_name,
        facilityId=doctor.facility_id,
        avatarInitials=doctor.avatar_initials,
        email=doctor.email,
        verified=doctor.verified,
    )

    return DoctorAuthResponse(
        success=True,
        data=DoctorAuthData(
            access_token=token,
            doctor=profile,
        ),
        message=f"Welcome back, {doctor.full_name}",
    )


@router.get("/doctor/me", response_model=DoctorAuthResponse)
async def get_current_doctor(
    request: Request,
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Doctor session token required."},
        )

    payload = decode_access_token(token)
    if not payload or payload.get("role") != "doctor" or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_SESSION", "message": "Invalid or expired doctor session."},
        )

    stmt = select(Doctor).where(Doctor.id == payload["sub"])
    res = await db.execute(stmt)
    doctor = res.scalar_one_or_none()
    if not doctor or not doctor.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DOCTOR_NOT_FOUND", "message": "Doctor profile not found."},
        )

    profile = DoctorProfileOut(
        id=doctor.id,
        fullName=doctor.full_name,
        credentials=doctor.credentials,
        registrationNumber=doctor.registration_number,
        specialty=doctor.specialty,
        facilityName=doctor.facility_name,
        facilityId=doctor.facility_id,
        avatarInitials=doctor.avatar_initials,
        email=doctor.email,
        verified=doctor.verified,
    )

    return DoctorAuthResponse(
        success=True,
        data=DoctorAuthData(
            access_token=token,
            doctor=profile,
        ),
        message="Doctor session active.",
    )


@router.post("/doctor/logout")
async def doctor_logout():
    return {"success": True, "message": "Doctor signed out successfully."}

