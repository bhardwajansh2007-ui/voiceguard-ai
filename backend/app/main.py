from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.init_db import init_database
from backend.app.api import auth, calls, speakers, security, audit, health, models_status, integration, caller_intelligence
from backend.app.websocket import audio_stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting up VoiceGuard AI platform...")
    init_database()
    yield
    logger.info("Shutting down VoiceGuard AI platform...")


# Ensure schema & baseline tables are initialized
init_database()

app = FastAPI(
    title="VOICEGUARD AI — Real-Time Voice Integrity & Impersonation Defense Platform",
    description=(
        "Production-grade cybersecurity platform detecting AI-generated and cloned voice "
        "impersonation in real time. Fuses acoustic authenticity, speaker verification, "
        "prosodic behavior, context intelligence, and transaction sensitivity."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration: Support localhost and LAN devices in development
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Global Exception Handler (Never expose stack traces to end users)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled system error on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Security Gateway Error",
            "message": "An unexpected error occurred during request processing. Details have been logged securely.",
        },
    )


# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(calls.router, prefix=settings.API_V1_PREFIX)
app.include_router(speakers.router, prefix=settings.API_V1_PREFIX)
app.include_router(speakers.router, prefix=f"{settings.API_V1_PREFIX}/identities-alias")
app.include_router(caller_intelligence.router, prefix=settings.API_V1_PREFIX)
app.include_router(security.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(models_status.router, prefix=settings.API_V1_PREFIX)
app.include_router(models_status.router, prefix="/api")
app.include_router(integration.router, prefix=settings.API_V1_PREFIX)

# Register WebSocket Routers
app.include_router(audio_stream.router)


@app.get("/")
def root_status():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "theme": "Blockchain & Cybersecurity",
        "organization": "All India Council for Technical Education (AICTE)",
        "department": "Cyber Security Cell",
        "status": "OPERATIONAL",
        "api_docs": "/docs",
    }
