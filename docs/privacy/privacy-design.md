# Privacy-by-Design Architecture

VoiceGuard AI treats biometric voice data as sensitive personal data subject to strict data minimization principles.

---

## 1. Zero Raw Audio Persistence

- Inbound audio files and real-time streaming chunks exist only in volatile RAM buffers during active analysis.
- Once acoustic feature extraction and embedding generation conclude, raw audio buffers are immediately unreferenced and deallocated.
- The platform enforces an `AUDIO_RETENTION_DAYS = 0` configuration default.

---

## 2. Consented Speaker Biometrics

- Enrolling a speaker profile mandates an explicit biometric consent declaration (`consent_recorded: true`).
- The enrollment pipeline converts raw voice audio into a 128-dimensional acoustic embedding vector.
- Only the mathematical vector is stored; original audio files are deleted.
- Authorized administrators can trigger an immediate biometric purge via `DELETE /api/v1/speakers/{speaker_id}`, which permanently destroys embedding vectors and registers a cryptographic audit event.

---

## 3. Privacy-Aware Logging

The platform employs a custom `PrivacyAwareJsonFormatter` that intercepts all structured log records. Sensitive fields (passwords, tokens, authorization headers, raw PCM bytes, and biometric vectors) are automatically masked with `[REDACTED_BY_POLICY]` before writing to stdout.
