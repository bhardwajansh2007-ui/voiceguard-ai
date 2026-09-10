#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "VOICEGUARD AI — PRODUCTION DEPLOYMENT INITIALIZER"
echo "=========================================================="

if [ ! -f .env ]; then
    echo "[!] .env file not detected. Copying from .env.example..."
    cp .env.example .env
    echo "[!] Please configure your .env secrets and re-run."
    exit 1
fi

echo "[1/3] Validating Docker and Docker Compose availability..."
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed."; exit 1; }

echo "[2/3] Building and starting VoiceGuard AI containers..."
docker-compose up --build -d

echo "[3/3] Running database schema migration and integrity check..."
docker-compose exec backend python -m backend.app.db.init_db

echo "=========================================================="
echo "DEPLOYMENT COMPLETE!"
echo "SOC Dashboard: http://localhost:80"
echo "API Docs:      http://localhost:8000/docs"
echo "=========================================================="
