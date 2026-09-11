# VOICEGUARD AI — PHASE 0 REPOSITORY FORENSIC AUDIT REPORT

**Audit Date:** September 11, 2026  
**Auditors:** Principal ML Engineer, Cybersecurity Architect, QA & Red-Team Auditor  
**Scope:** Full-stack codebase inspection (Frontend, Backend, ML Services, Telemetry, Tests, Checkpoints)

---

## 1. INVENTORY OF CODEBASE ASSETS

### 1.1 Machine Learning Checkpoints & Weights
- **AASIST Anti-Spoofing:**
  - File: `backend/app/services/ml/anti_spoof/checkpoints/AASIST.pth`
  - Size: `1,281,532 bytes` (1.22 MB)
  - Computed SHA-256: `51d2d9cf0738172f61e2a384ec50a54a55363240f67c971ed55a92435bc1a1c0`
  - State Dictionary Keys: `229 / 229` (0 missing, 0 unexpected on `strict=True` loading)
  - Parameter Count: `297,866` float32 parameters
  - Operational Hardware: CUDA (`NVIDIA GeForce RTX 3050 6GB Laptop GPU`)
- **Speaker Verification:**
  - Architecture: Multi-Frame DCT Filterbank & Temporal Prosodic Feature Vector (128-D)
  - Classification: Handcrafted non-neural acoustic representation (Cosine similarity metric)
  - Pretrained Checkpoint: None bundled; supports custom torch checkpoints via `SPEAKER_VERIFICATION_MODEL_PATH`.

### 1.2 Audio & Datasets Ingestion
- Directory: `backend/app/data/samples/`
  - `aarav_ref.wav` (SHA: `ef575739b24ef97d...`, 215,159 samples, Enrolled Aarav reference)
  - `aarav_diff_utterance.wav` (SHA: `8738088ddb749c63...`, 139,689 samples, Alternate clean Aarav phrase)
  - `legitimate_sample.wav` (SHA: `02d7ee27707e6d5e...`, 156,125 samples, Aarav authentic stream)
  - `synthetic_clone_sample.wav` (SHA: `109aa9c853949d34...`, 156,125 samples, Neural voice clone)
  - `female_speaker.wav` (SHA: `fc1cda1b398f9c1b...`, 147,691 samples, Microsoft Zira TTS)
  - `hazel_speaker.wav` (SHA: `7c9ab82083cf2b83...`, 161,672 samples, Microsoft Hazel UK TTS)
  - `unknown_sample.wav` (SHA: `f950022e37b996a2...`, 99,010 samples, Un-enrolled speaker sample)

### 1.3 Backend Pipeline
- **FastAPI Core (`backend/app/main.py`):** Ingestion endpoints, authentication (JWT HS256), CORS middleware.
- **Audio Validation & Preprocessing (`backend/app/services/audio/`):**
  - WAV header and byte inspection (`validator.py`)
  - 16 kHz mono resampling, float32 linear normalization (`preprocessor.py`)
  - Voice Activity Detection via energy and zero-crossing heuristics (`vad.py`)
  - Fast FFT-based spectral and pitch feature extraction (`acoustic.py`)
- **Risk Fusion Engine (`backend/app/services/risk/fusion_engine.py`):**
  - Multi-signal weighted risk fusion ($R \in [0, 100]$)
  - Inputs: Anti-spoof score, speaker mismatch, behavioral prosody, caller context, transaction sensitivity
  - Impersonation cross-term escalation logic
- **Policy Enforcement (`backend/app/services/security/policy_engine.py`):**
  - Tiered actions: `ALLOW`, `ADDITIONAL_VERIFICATION`, `STRONG_VERIFICATION`, `HOLD_SENSITIVE_ACTION`
  - High-value transaction thresholding ($> ₹2,50,000$)
- **Audit Ledger (`backend/app/services/audit/ledger.py`):**
  - Cryptographic hash chaining: $H_N = \text{SHA256}(H_{N-1} \parallel \text{Type} \parallel \text{TS} \parallel \text{PayloadHash})$
- **Real-Time Streaming (`backend/app/websocket/audio_stream.py`):**
  - 2.5s sliding window with 0.5s hop rate
  - Full per-window inference and diagnostic metadata broadcasting

---

## 2. GLOBAL ANTI-MOCK AUDIT FINDINGS

| Audit Category | Search Term | Scope | Finding / Remediation Status |
| :--- | :--- | :--- | :--- |
| **Random Prediction** | `Math.random` | Frontend | **CLEAN.** Found only in non-security contexts for generating random session ID suffixes (`CALL-XXXX`) and dummy caller phone numbers. Zero ML scores use random generation. |
| **Hardcoded Predictions** | `0.88`, `0.85`, `0.9` | Backend | **CLEAN.** No hardcoded risk or prediction values found in inference paths. `0.85` exists only as spectral rolloff constant (DSP) and static transaction weight. |
| **Frontend Fallbacks** | `?? 85`, `?? 15` | Frontend | **CLEAN.** Purged all ternary fallback numbers in `ControlledSecurityTest.tsx`. Frontend strictly checks backend records and throws errors if responses are missing. |
| **Preset Scenario Overrides** | `SCENARIO -> score` | Full Codebase | **CLEAN.** Scenario controls only select which benchmark WAV file is streamed over WebSocket or uploaded to REST API. Inference executes live on the backend. |
| **Model Misnaming (ECAPA)** | `ECAPA` | Full Codebase | **CLEAN.** Purged all remaining text occurrences in `RiskCenter.tsx`, `IdentityRegistry.tsx`, `IntegrationGateway.tsx`, `ProtectedCalls.tsx`, `LiveProtection.tsx`, `SecurityOverview.tsx`, and `adapter.py`. Truthfully reclassified as "128-D Acoustic-Prosodic Representation". |
| **Model Misnaming (WavLM)** | `WavLM` | Full Codebase | **CLEAN.** Purged misleading mentions in `LiveProtection.tsx` and `base.py`. Truthfully cited as AASIST Graph Attention Network. |
| **Client-Side Decisions** | Policy logic | Frontend | **CLEAN.** Zero client-side risk or policy calculation. Frontend strictly acts as a presentation layer for backend decisions. |

---

## 3. AUDIT CONCLUSION
The codebase is free of fake scores, random predictions, and misleading deepfake claims. AASIST operates on verified CUDA hardware, and the speaker verification module is truthfully documented as a handcrafted acoustic feature extractor.
