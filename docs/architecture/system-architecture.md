# VOICEGUARD AI — System Architecture

**Real-Time Voice Integrity & Impersonation Defense Platform**  
*Organization: All India Council for Technical Education (AICTE)*  
*Department: Cyber Security Cell | Smart India Hackathon 2026*

---

## 1. High-Level Architectural Topology

VoiceGuard AI acts as a decoupled security decision-support layer positioned between communication ingestion gateways (telephony, VoIP, web microphone streams) and high-impact enterprise workflows (wire transfers, credential changes, data access).

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

## 2. Ingestion & Preprocessing Subsystems

- **Standardization**: All audio inputs are decoded, resampled to 16,000 Hz, converted from stereo to single-channel (mono), and scaled to float32 range `[-1.0, 1.0]`.
- **Voice Activity Detection (VAD)**: Utilizes short-time energy (RMS) and zero-crossing rate (ZCR) to discriminate human speech frames from ambient silence and line noise. Non-speech frames are discarded to prevent false threat classifications.
- **Sliding Ring Buffer**: In streaming mode, chunks are accumulated into a 2.5-second analysis window with a 0.5-second hop, ensuring near real-time progressive threat updates.

---

## 3. Four Core Questions Answered

1. **Is the received speech likely genuine or synthetic/manipulated?**  
   Evaluated via the Voice Anti-Spoofing adapter inspecting acoustic micro-artifacts and spectral roll-off anomalies.
2. **Does the voice resemble the claimed speaker?**  
   Evaluated via the Speaker Verification adapter calculating cosine similarity against consented enrolled 128-dimensional biometric embeddings.
3. **Does the communication behavior/context indicate impersonation risk?**  
   Evaluated via behavioral prosodic jitter/shimmer and contextual caller ID authenticity.
4. **Should the requested sensitive action be allowed, additionally verified, or held?**  
   Enforced via the Security Policy Engine without ever delegating authorization to the client interface.
