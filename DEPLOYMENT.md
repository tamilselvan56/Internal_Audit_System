# Audit System Deployment Guide

## Stack
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: React + Vite
- Auth: JWT Bearer tokens

## Development

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Database
- The app uses the `DATABASE_URL` in `backend/.env`.
- The repo now includes direct one-time schema syncs that were already applied in this environment.
- For fresh environments, run:

```bash
cd backend
.venv\Scripts\python scripts\seed.py
```

## Default Users
- `admin@company.com / admin123`
- `hr@company.com / hr123`
- `it@company.com / it123`
- `finance@company.com / finance123`
- `admindept@company.com / admin123`
- `auditor@company.com / audit123`

## Notes
- Asset intake, repair, and document flows depend on PostgreSQL tables being present.
- Employee and step document APIs are exposed under `/api/documents/...`.
