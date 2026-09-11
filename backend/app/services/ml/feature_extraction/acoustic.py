import numpy as np
from typing import Dict, Any, List
from backend.app.schemas.analysis import AcousticFeatures


def _dct_type2(x: np.ndarray, n: int = 13) -> np.ndarray:
    """Discrete Cosine Transform (Type-II) with orthonormal scaling."""
    N = len(x)
    k = np.arange(min(n, N))
    indices = np.arange(N)
    basis = np.cos(np.pi * (2 * indices + 1)[:, None] * k / (2.0 * N))
    res = np.dot(x, basis)
    res[0] *= np.sqrt(1.0 / (4.0 * N)) * 2
    if len(res) > 1:
        res[1:] *= np.sqrt(1.0 / (2.0 * N)) * 2
    if len(res) < n:
        res = np.pad(res, (0, n - len(res)))
    return res[:n]


class AcousticFeatureExtractor:
    """
    Computes scientifically grounded physical acoustic and prosodic features:
    MFCC, Spectral Centroid, Bandwidth, Rolloff, ZCR, RMS Energy, F0 Pitch, Jitter, and Shimmer.
    """

    def __init__(self, sample_rate: int = 16000, n_mfcc: int = 13, n_fft: int = 512, hop_length: int = 256):
        self.sample_rate = sample_rate
        self.n_mfcc = n_mfcc
        self.n_fft = n_fft
        self.hop_length = hop_length

    def _hz_to_mel(self, hz: np.ndarray) -> np.ndarray:
        return 2595.0 * np.log10(1.0 + hz / 700.0)

    def _mel_to_hz(self, mel: np.ndarray) -> np.ndarray:
        return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)

    def _get_mel_filterbank(self, n_filters: int = 26) -> np.ndarray:
        """Constructs triangular Mel filterbank matrix."""
        low_freq_mel = self._hz_to_mel(np.array([0.0]))[0]
        high_freq_mel = self._hz_to_mel(np.array([self.sample_rate / 2.0]))[0]
        mel_points = np.linspace(low_freq_mel, high_freq_mel, n_filters + 2)
        hz_points = self._mel_to_hz(mel_points)
        bins = np.floor((self.n_fft + 1) * hz_points / self.sample_rate).astype(int)

        filterbank = np.zeros((n_filters, self.n_fft // 2 + 1))
        for m in range(1, n_filters + 1):
            f_m_minus = bins[m - 1]
            f_m = bins[m]
            f_m_plus = bins[m + 1]

            for k in range(f_m_minus, f_m):
                if f_m != f_m_minus:
                    filterbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
            for k in range(f_m, f_m_plus):
                if f_m_plus != f_m:
                    filterbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

        return filterbank

    def extract_features(self, audio: np.ndarray, vad_speech_ratio: float = 0.0) -> AcousticFeatures:
        """Extracts comprehensive physical acoustic features from preprocessed audio."""
        duration_seconds = float(len(audio)) / float(self.sample_rate)

        if len(audio) < self.n_fft:
            # Pad audio if shorter than FFT window
            audio = np.pad(audio, (0, self.n_fft - len(audio)))

        # 1. RMS Energy
        rms_energy = float(np.sqrt(np.mean(audio ** 2)))

        # 2. Zero-crossing rate
        zcr = float(np.mean(np.abs(np.diff(np.sign(audio)))) / 2.0)

        # 3. Spectral magnitude using Short-Time FFT
        num_frames = max(1, 1 + int((len(audio) - self.n_fft) / self.hop_length))
        window = np.hanning(self.n_fft)
        freqs = np.fft.rfftfreq(self.n_fft, 1.0 / self.sample_rate)
        
        magnitudes = []
        centroids = []
        bandwidths = []
        rolloffs = []

        for i in range(num_frames):
            start = i * self.hop_length
            end = start + self.n_fft
            frame = audio[start:end]
            if len(frame) < self.n_fft:
                frame = np.pad(frame, (0, self.n_fft - len(frame)))

            windowed = frame * window
            mag = np.abs(np.fft.rfft(windowed))
            magnitudes.append(mag)

            mag_sum = np.sum(mag)
            if mag_sum > 1e-6:
                # Spectral Centroid
                centroid = np.sum(freqs * mag) / mag_sum
                centroids.append(centroid)

                # Spectral Bandwidth
                bw = np.sqrt(np.sum(((freqs - centroid) ** 2) * mag) / mag_sum)
                bandwidths.append(bw)

                # Spectral Rolloff (85% threshold)
                cumsum = np.cumsum(mag)
                rolloff_idx = np.searchsorted(cumsum, 0.85 * mag_sum)
                rolloff_idx = min(rolloff_idx, len(freqs) - 1)
                rolloffs.append(freqs[rolloff_idx])

        mean_centroid = float(np.mean(centroids)) if centroids else 0.0
        mean_bandwidth = float(np.mean(bandwidths)) if bandwidths else 0.0
        mean_rolloff = float(np.mean(rolloffs)) if rolloffs else 0.0

        # 4. Mel-Frequency Cepstral Coefficients (MFCC)
        fb = self._get_mel_filterbank(n_filters=26)
        mean_mag = np.mean(magnitudes, axis=0) if magnitudes else np.zeros(self.n_fft // 2 + 1)
        mel_energies = np.dot(fb, mean_mag)
        log_mel = np.log(np.maximum(mel_energies, 1e-10))
        mfccs = _dct_type2(log_mel, n=self.n_mfcc)
        mfcc_list = [float(x) for x in mfccs]

        # 5. Fundamental Frequency (F0 Pitch) via Fast FFT Autocorrelation
        # Limit pitch analysis segment to 48000 samples (~3.0s) for real-time responsiveness
        analysis_audio = audio[:48000] if len(audio) > 48000 else audio
        n_pts = len(analysis_audio)
        n_fft_corr = 1 << (2 * n_pts - 1).bit_length()
        fx = np.fft.rfft(analysis_audio, n=n_fft_corr)
        corr = np.fft.irfft(fx * np.conj(fx))[:n_pts]

        # Search in human vocal range (60 Hz to 450 Hz)
        min_lag = int(self.sample_rate / 450)
        max_lag = int(self.sample_rate / 60)

        f0 = 0.0
        jitter = 0.0
        shimmer = 0.0

        if len(corr) > max_lag and corr[0] > 1e-6:
            window_corr = corr[min_lag:max_lag]
            peak_lag = min_lag + int(np.argmax(window_corr))
            if corr[peak_lag] > 0.3 * corr[0]:
                f0 = float(self.sample_rate / peak_lag)

                # Estimate Jitter & Shimmer across short chunks
                chunk_len = peak_lag * 2
                periods = []
                amplitudes = []
                # Sub-sample up to 16 chunks to keep jitter/shimmer estimation deterministic & fast
                max_chunks = 16
                step = max(chunk_len, (len(analysis_audio) - chunk_len) // max_chunks) if len(analysis_audio) > chunk_len * 2 else chunk_len
                for s in range(0, len(analysis_audio) - chunk_len, step):
                    sub_audio = analysis_audio[s : s + chunk_len]
                    sub_fx = np.fft.rfft(sub_audio, n=chunk_len * 2)
                    sub_corr = np.fft.irfft(sub_fx * np.conj(sub_fx))[:chunk_len]
                    if len(sub_corr) > min_lag:
                        p_idx = min_lag + int(np.argmax(sub_corr[min_lag : min(len(sub_corr), max_lag)]))
                        periods.append(p_idx)
                        amplitudes.append(float(np.max(np.abs(sub_audio))))

                if len(periods) > 2:
                    period_diffs = np.abs(np.diff(periods))
                    jitter = float(np.mean(period_diffs) / (np.mean(periods) + 1e-6))
                if len(amplitudes) > 2 and np.mean(amplitudes) > 1e-4:
                    amp_diffs = np.abs(np.diff(amplitudes))
                    shimmer = float(np.mean(amp_diffs) / (np.mean(amplitudes) + 1e-6))

        return AcousticFeatures(
            duration_seconds=round(duration_seconds, 3),
            sample_rate=self.sample_rate,
            vad_speech_ratio=round(vad_speech_ratio, 3),
            rms_energy=round(rms_energy, 4),
            spectral_centroid=round(mean_centroid, 2),
            spectral_bandwidth=round(mean_bandwidth, 2),
            spectral_rolloff=round(mean_rolloff, 2),
            zero_crossing_rate=round(zcr, 4),
            fundamental_frequency_f0=round(f0, 2),
            jitter_local=round(min(jitter, 1.0), 4),
            shimmer_local=round(min(shimmer, 1.0), 4),
            mfcc_mean=[round(x, 4) for x in mfcc_list],
        )


extractor = AcousticFeatureExtractor()
