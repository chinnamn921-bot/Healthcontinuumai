@echo off
echo ===============================================================
echo  HealthContinuum AI — Unified Full-Stack Platform Launcher
echo ===============================================================
echo.
echo [1/3] Seeding Authoritative Database and Doctor Profile...
cd /d "%~dp0maruthi\Health\backend"
python seed.py

echo.
echo [2/3] Building Doctor Dashboard Production Bundle...
cd /d "%~dp0doctorsdashboard-main"
call npm run build

echo.
echo [3/3] Starting Unified FastAPI Backend & Server...
echo ---------------------------------------------------------------
echo   Unified Portal:    http://localhost:8000/
echo   Patient App:       http://localhost:8000/patient
echo   Doctor Dashboard:  http://localhost:8000/doctor
echo   API Documentation: http://localhost:8000/api/docs
echo   System Health:     http://localhost:8000/api/health
echo ---------------------------------------------------------------
echo.
cd /d "%~dp0maruthi\Health\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
