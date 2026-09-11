# ==========================================
# STAGE 1: Build React Frontend
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copy package manifests and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build production dist
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Python Backend Runtime
# ==========================================
FROM python:3.11-slim AS runtime
WORKDIR /app

# Install system utilities needed for audio processing and networking
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Optimize Python execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Install CPU-only PyTorch first (optimizes Docker layer caching)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code and pretrained AASIST model checkpoint
COPY backend/ ./backend/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose service port (Render dynamically sets $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Launch production ASGI server
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
