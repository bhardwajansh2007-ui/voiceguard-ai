# Machine Learning Training & Evaluation Pipeline

This directory contains configuration files and reproducible scripts for training and evaluating VoiceGuard AI's anti-spoofing and speaker verification architectures.

## Supported Datasets

1. **ASVspoof 2019 / 2021 (Logical Access)**
   - Used for benchmarking genuine vs synthetically generated or voice-cloned speech.
   - Ground truth labels: `bonafide` (genuine) vs `spoof` (synthetic).

2. **IndicVoices / Multilingual Indian Speech Resources**
   - Used for validating phonetic and acoustic diversity across Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, etc.).
   - Prioritizes language-robust acoustic spectral filterbanks rather than language-specific lexical tokens.

> [!IMPORTANT]
> **Zero Demo Data & Licensing Compliance**:
> VoiceGuard AI does not distribute copyrighted or restricted audio datasets directly in the code repository. Users and researchers must download licensed datasets from official sources and configure their filepaths in `model_training/configs/default.yaml`.

## Evaluation Standards

Evaluated models report:
- **EER (Equal Error Rate)**: The operating threshold where False Acceptance Rate (FAR) matches False Rejection Rate (FRR).
- **ROC-AUC**: Receiver Operating Characteristic Area Under Curve.
- **Inference Latency**: Single-window processing latency measured in milliseconds.
