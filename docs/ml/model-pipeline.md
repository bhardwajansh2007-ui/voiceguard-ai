# Machine Learning & Feature Extraction Pipeline

VoiceGuard AI decouples voice authenticity detection from speaker identity verification. This document details the acoustic representation, inference adapters, and zero-mock policy compliance.

---

## 1. Physical Feature Extraction

The platform computes 13-dimensional Mel-Frequency Cepstral Coefficients (MFCCs) alongside physical acoustic moments using SciPy:

- **Root Mean Square (RMS) Energy**: Quantifies instantaneous acoustic signal amplitude.
- **Spectral Centroid**: Represents the "center of mass" of the frequency spectrum:
  $$\text{Centroid} = \frac{\sum_{k} f_k \cdot |X(k)|}{\sum_{k} |X(k)|}$$
- **Spectral Bandwidth & 85% Rolloff**: Measures frequency dispersion and high-frequency decay typical of vocal tract resonance.
- **Zero Crossing Rate (ZCR)**: Rates of sign changes in time domain, differentiating fricatives from synthetic vocoder artifacts.
- **Pitch Tracking (F0)**: Fundamental frequency estimated via temporal autocorrelation.
- **Perturbation Metrics (Jitter & Shimmer)**: Local pitch period perturbation (jitter) and amplitude fluctuation (shimmer) detect mechanical neural synthesis cadences.

---

## 2. Voice Anti-Spoofing Adapter

- Implements `BaseAntiSpoofModel`.
- Preferred Architecture: **AASIST** (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks).
- Output: `spoof_probability`, `genuine_probability`, `model_confidence`.
- **Zero-Mock Policy Compliance**: If no checkpoint exists at `settings.ANTI_SPOOF_MODEL_PATH`, the adapter explicitly reports `status="MODEL_NOT_CONFIGURED"`. The risk engine redistributes signal weights rather than inventing fake percentages.

---

## 3. Speaker Biometric Verification Adapter

- Implements `BaseSpeakerVerificationModel`.
- Computes 128-dimensional L2-normalized acoustic speaker embeddings combining multi-frame filterbanks, temporal moments, and pitch autocorrelation properties:
  $$\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_2}$$
- Evaluates similarity against enrolled identity via cosine similarity:
  $$\text{Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
- **Critical Security Principle**: Speaker verification is NOT proof of authenticity. Cloned voices match the biometric target; therefore, biometric matching and anti-spoofing remain independent signals.
