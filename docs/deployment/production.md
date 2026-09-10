# Production Deployment Guide

## 1. Quick Start via Docker Compose

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2+

### Step 1: Clone and Configure Environment
```bash
cp .env.example .env
# Edit .env and configure your SECRET_KEY, POSTGRES credentials, and CORS origins
```

### Step 2: Build and Launch Services
```bash
docker-compose up --build -d
```

### Step 3: Verify Services
- **SOC Web Dashboard**: `http://localhost:80`
- **FastAPI OpenAPI Swagger**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/v1/health`

---

## 2. Native Development Setup (Windows / Linux / macOS)

### Backend
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Initialize database & default administrative account
python -m backend.app.db.init_db

# 3. Run FastAPI backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Run Vite dev server
npm run dev
# Dashboard opens on http://localhost:5173
```

---

## 3. Initial Administrative Credentials
- **Username**: `admin`
- **Default Password**: `VoiceGuardAdmin2026!`
- *(Change passphrase immediately upon first login in production environments)*
