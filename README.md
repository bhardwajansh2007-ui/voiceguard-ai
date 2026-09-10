# VOICEGUARD AI

## Real-Time Voice Integrity & Impersonation Defense Platform

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Theme](https://img.shields.io/badge/Theme-Blockchain%20%26%20Cybersecurity-emerald.svg)]()
[![Organization](https://img.shields.io/badge/Organization-AICTE-purple.svg)]()
[![Department](https://img.shields.io/badge/Department-Cyber%20Security%20Cell-cyan.svg)]()
[![License](https://img.shields.io/badge/License-MIT-orange.svg)]()

> **Product Positioning:**  
> VoiceGuard AI is **NOT** positioned as an infallible oracle that guarantees 100% deepfake detection.  
> It functions as a **layered security decision-support and prevention platform** that detects synthetic or manipulated speech, verifies speaker identity consistency, evaluates communication and transaction context, calculates an explainable impersonation-risk score, and triggers independent verification before sensitive actions are authorized.

---

## 1. System Overview & Core Philosophy

With the proliferation of accessible neural voice cloning and generative audio models, attackers can clone the voices of corporate executives, government officials, or trusted individuals to manipulate operators into authorizing fraudulent wire transfers or leaking confidential credentials.

VoiceGuard AI answers four critical questions on every communication:
1. **Is the received speech likely genuine or synthetic/manipulated?** *(Voice Anti-Spoofing)*
2. **Does the voice resemble the claimed speaker?** *(Speaker Biometric Verification)*
3. **Does the communication behavior/context indicate impersonation risk?** *(Prosody & Context Intelligence)*
4. **Should the requested sensitive action be allowed, additionally verified, or held?** *(Security Policy Engine)*

```
VOICE AUTHENTICITY + SPEAKER VERIFICATION + BEHAVIORAL PROSODY + CONTEXT RISK + TRANSACTION RISK
                                                ▼
                                   OVERALL IMPERSONATION RISK
                                                ▼
                                    SECURITY POLICY ENFORCEMENT
                                (ALLOW / VERIFY / HOLD SENSITIVE ACTION)
```

---

## 2. Key Differentiators & Absolute Standards

- **Zero-Mock Policy**: No fake analytics, no hardcoded risk scores, no placeholder database records, and no fabricated ML percentages. When no checkpoint is loaded, the system strictly reports `MODEL_NOT_CONFIGURED`.
- **Prevention-First Architecture**: Does not stop at classification. Intercepts high-stakes transactions and places them on automated `HOLD`, requiring multi-factor authentication or supervisor out-of-band callback.
- **Cryptographic Audit Ledger**: High-impact events are committed to a SHA-256 tamper-evident hash chain (`event_hash` = Hash(prev_hash + event_type + timestamp + payload_hash)), ensuring verifiable auditability without putting heavy ML inference on the blockchain.
- **Privacy-by-Design**: 0-day raw audio retention. Streaming chunks and audio files exist exclusively in volatile memory during analysis and are immediately discarded. Speaker profiles store only mathematical 128-dimensional L2-normalized embedding vectors with explicit consent.
- **Explainable Decisions**: Every security decision provides a human-readable decomposition of contributing factors and exact mathematical weights applied.

---

## 3. Technology Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, WebSockets, SQLAlchemy 2.0, Pydantic v2, Argon2-cffi, PyJWT, SciPy, NumPy, scikit-learn.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Web Audio API (real Canvas waveform rendering), native WebSocket client.
- **Database**: PostgreSQL 16 (production) / SQLite with connection pooling (development fallback).
- **Inference & DSP**: Pure SciPy/NumPy 13-MFCC and acoustic moment extraction; AASIST / Torch model adapters.
- **Deployment**: Docker, Docker Compose, Nginx reverse proxy.

---

## 4. Platform Architecture

```
[Inbound Communication] ──► Uploaded Audio (WAV/MP3) / Live WebRTC WebSocket Stream
                                     │
                                     ▼
                      [Audio Validation & Ingestion Gateway]
                                     │
                                     ▼
                      [VAD & Audio Preprocessing (16kHz Mono)]
                                     │
                                     ▼
                      [Physical Acoustic Feature Extractor]
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
  [Acoustic Anti-Spoof]    [Speaker Verification]   [Behavioral & Prosody]
  (AASIST / Acoustic)      (128-dim Vector Cosine)  (Hesitation, Jitter, F0)
            │                        │                        │
            └────────────────────────┼────────────────────────┘
                                     ▼
                           [Context Risk Engine]
                     (Caller Anonymity, Action Stakes)
                                     │
                                     ▼
                           [Risk Fusion Engine]
                   (Transparent Multi-Signal Weighting)
                                     │
                                     ▼
                         [Security Policy Engine]
                     (ALLOW / VERIFY / HOLD Action)
                                     │
            ┌────────────────────────┴────────────────────────┐
            ▼                                                 ▼
[Cryptographic Audit Ledger]                      [SOC Frontend Dashboard]
  (SHA-256 Hash Chain)                                (Real-Time Signals)
```

---

## 5. Quick Start & Installation

### Option A: Local Native Development

#### 1. Backend Setup
```bash
# Clone and navigate to workspace
cd voiceguardai

# Copy environment template
cp .env.example .env

# Install backend dependencies
pip install -r backend/requirements.txt

# Initialize database schema and default admin
python -m backend.app.db.init_db

# Run FastAPI backend
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

- **Initial Admin Credentials:**  
  - Username: `admin`  
  - Passphrase: `VoiceGuardAdmin2026!`

---

### Option B: Production Docker Deployment

```bash
# Build and launch all services (PostgreSQL, FastAPI Backend, Nginx Frontend)
docker-compose up --build -d

# Initialize database in container
docker-compose exec backend python -m backend.app.db.init_db
```

- **SOC Web Dashboard**: `http://localhost:80`
- **FastAPI OpenAPI Swagger**: `http://localhost:8000/docs`

---

## 6. Running the Automated Test Suite

VoiceGuard AI includes 16 comprehensive unit and integration tests covering authentication, audio DSP, acoustic feature extraction, multi-signal risk fusion, security policies, and cryptographic hash chain tampering detection.

```bash
# Run complete test suite
python -m pytest backend/tests/ -v
```

---

## 7. Model Training & Evaluation

Instructions and reproducible scripts for training on ASVspoof and multilingual Indian speech resources (e.g. IndicVoices) are located in `model_training/`:

```bash
# Run training configuration
python model_training/training/train_anti_spoof.py --config model_training/configs/default.yaml

# Run evaluation pipeline (EER, ROC-AUC, FAR, FRR)
python model_training/evaluation/evaluate.py --checkpoint checkpoints/anti_spoof.pth --test-dir datasets/eval
```

---

## 8. Safe SIH Deployment Mode

In compliance with Smart India Hackathon guidelines:
- The platform operates in sandbox deployment mode (`DEPLOYMENT_MODE=development`).
- Adapters for Core Banking switches, SS7/SIP telecom carriers, and National ID providers safely return `NOT_CONFIGURED` without mock production credentials.
- The system never executes irreversible financial debits or telecom disruptions.

---

## 9. Legal & Safety Notice

*VoiceGuard AI is developed as an advanced cybersecurity prototype and decision-support tool. Production deployment in enterprise banking, telecom, or government infrastructure requires organization-specific legal, compliance, and regulatory review. The software is provided under the MIT License.*
