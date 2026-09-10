# REST & WebSocket API Reference

The VoiceGuard AI platform exposes comprehensive OpenAPI 3.1 documentation at `http://localhost:8000/docs`.

---

## 1. Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/login`: Authenticates with username and Argon2 password. Returns JWT token.
- `POST /api/v1/auth/register`: Registers a new operator or analyst.
- `GET /api/v1/auth/me`: Returns profile of the current authenticated operator.

---

## 2. Call Sessions & Audio Ingestion (`/api/v1/calls`)

- `POST /api/v1/calls`: Initializes a new monitored communication session.
- `GET /api/v1/calls`: Lists all communication sessions.
- `GET /api/v1/calls/{call_id}`: Retrieves complete intelligence dossier for a call session.
- `PATCH /api/v1/calls/{call_id}/context`: Updates session metadata (caller ID, action, amount).
- `POST /api/v1/calls/{call_id}/audio`: Uploads WAV/MP3/FLAC audio for full multi-signal analysis.
- `WS /ws/calls/{call_id}/stream`: Bidirectional WebSocket for real-time 16kHz PCM streaming.

---

## 3. Speaker Biometrics (`/api/v1/speakers`)

- `POST /api/v1/speakers/enroll`: Consented speaker enrollment with voice sample.
- `GET /api/v1/speakers`: Lists enrolled identity profiles.
- `DELETE /api/v1/speakers/{speaker_id}`: Permanently purges biometric voice embeddings.

---

## 4. Security Policy & Interventions (`/api/v1/security`)

- `GET /api/v1/security/decisions`: Lists policy decisions and intervention holds.
- `POST /api/v1/security/decisions/{call_id}/resolve`: Analyst override or release of held transaction.
- `POST /api/v1/security/verification/{call_id}/initiate`: Dispatches MFA or supervisor callback challenge.
- `POST /api/v1/security/verification/{call_id}/complete`: Confirms challenge code and releases hold.

---

## 5. Forensic Audit Ledger (`/api/v1/audit`)

- `GET /api/v1/audit`: Returns sequential append-only audit events.
- `GET /api/v1/audit/call/{call_id}`: Full chronological audit trail for a specific call.
- `GET /api/v1/audit/verify-chain`: Cryptographically traverses and verifies SHA-256 hash continuity.

---

## 6. Telemetry & Health (`/api/v1/health`, `/api/v1/models/status`)

- `GET /api/v1/health`: Real telemetry for database, ML engine, WebSocket, and uptime.
- `GET /api/v1/models/status`: Telemetry on loaded anti-spoof and speaker models.
