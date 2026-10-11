@echo off
echo =====================================================
echo  HealthContinuum AI — Backend Startup
echo =====================================================
cd /d "%~dp0backend"

echo [1/3] Seeding database...
python seed.py

echo.
echo [2/3] Starting FastAPI backend...
echo API Docs: http://localhost:8000/api/docs
echo Health:   http://localhost:8000/api/health
echo.
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
