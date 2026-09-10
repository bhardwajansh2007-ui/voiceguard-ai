# Security Model & Threat Defense Policy

## 1. Multi-Signal Risk Fusion

The platform calculates a composite impersonation threat score ($0 - 100$) using weighted linear combination:

$$\text{Risk} = \sum_{i} w_i \cdot S_i$$

Where:
- $w_{\text{spoof}} = 0.35$ (Voice authenticity)
- $w_{\text{speaker}} = 0.25$ (Speaker biometric mismatch)
- $w_{\text{behavior}} = 0.15$ (Prosodic instability & unnatural cadence)
- $w_{\text{caller}} = 0.10$ (Caller ID masking & authentication state)
- $w_{\text{transaction}} = 0.15$ (Transaction value & action sensitivity)

---

## 2. Policy Enforcement Tiers

| Score Range | Threat Tier | Security Policy Decision | Mandated Mitigation |
| :--- | :--- | :--- | :--- |
| **0.0 — 30.0** | `LOW` | `ALLOW` | None |
| **30.1 — 60.0** | `MEDIUM` | `ADDITIONAL_VERIFICATION` | MFA Push Challenge |
| **60.1 — 80.0** | `HIGH` | `STRONG_VERIFICATION` | Supervisor Out-of-Band Callback |
| **80.1 — 100.0** | `CRITICAL` | `HOLD_SENSITIVE_ACTION` | Transaction Locked; Dual Authorization |

### Hard Security Overrides
1. **High Synthetic Probability**: If acoustic spoof probability $\ge 0.80$, the system unconditionally forces `HOLD_SENSITIVE_ACTION`.
2. **High-Stakes Anomaly**: If the requested operation is marked `CRITICAL` or transaction value $> ₹250,000$ with risk $\ge 35.0$, the action is immediately held for dual supervisor sign-off.

---

## 3. Cryptographic Tamper-Evident Audit Ledger

Security decisions, voice analysis completions, and analyst overrides are committed to an append-only cryptographic hash chain:

$$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} \,\|\, \text{EventType} \,\|\, \text{TimestampISO} \,\|\, \text{PayloadHash})$$

This prevents internal or external threat actors from modifying past logs, suppressing alarms, or falsifying analyst resolutions.
