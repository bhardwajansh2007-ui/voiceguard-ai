#!/usr/bin/env bash
# ===================================================
# Render Build Script for VoiceGuard AI
# ===================================================
set -o errexit

echo ">>> [1/3] Building React TypeScript Frontend..."
cd frontend
npm install
npm run build
cd ..

echo ">>> [2/3] Installing CPU-optimized PyTorch..."
pip install --upgrade pip
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu

echo ">>> [3/3] Installing Backend Python Requirements..."
pip install -r backend/requirements.txt

echo ">>> Build completed successfully for Render!"
