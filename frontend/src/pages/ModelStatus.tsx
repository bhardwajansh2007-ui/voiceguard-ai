import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Activity, AlertTriangle, RefreshCw, Layers, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ModelHealth } from '../types';

export const ModelStatus: React.FC = () => {
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.models.getStatus();
      setModelHealth(data);
    } catch (err) {
      console.error('Failed to load model health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
            Machine Learning Registry & Model Health
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real telemetry for AI anti-spoofing and speaker verification architectures. Zero simulated metrics.
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {!modelHealth ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          Loading model registry telemetry...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Computing Device Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block">ACTIVE ACCELERATOR DEVICE</span>
                <span className="text-base font-mono font-bold text-slate-100">
                  {modelHealth.device} {modelHealth.gpu_device_name ? `(${modelHealth.gpu_device_name})` : ''}
                </span>
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="text-slate-400 block text-[10px] uppercase">CUDA ACCELERATION:</span>
              <span className={modelHealth.is_gpu_available ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {modelHealth.is_gpu_available ? 'AVAILABLE (GPU ACCELERATED)' : 'CPU FALLBACK MODE'}
              </span>
            </div>
          </div>

          {/* Model Adapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Anti-Spoofing Architecture */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 font-mono">
                    Voice Anti-Spoof Adapter
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    modelHealth.anti_spoof_model.status === 'LOADED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {modelHealth.anti_spoof_model.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Architecture:</span>
                  <span className="text-slate-200 font-semibold">{modelHealth.anti_spoof_model.model_name}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Model Version:</span>
                  <span className="text-slate-200">{modelHealth.anti_spoof_model.model_version}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Checkpoint Path:</span>
                  <span className="text-slate-400 truncate max-w-xs">{modelHealth.anti_spoof_model.configured_path}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Inference Latency:</span>
                  <span className="text-cyan-400 font-bold">
                    {modelHealth.anti_spoof_model.last_latency_ms
                      ? `${modelHealth.anti_spoof_model.last_latency_ms} ms`
                      : 'Pending Evaluation'}
                  </span>
                </div>
              </div>

              {modelHealth.anti_spoof_model.status === 'MODEL_NOT_CONFIGURED' && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                  <strong>Zero-Mock Compliance Notice:</strong> No deepfake model weights path is configured in the environment. The platform strictly reports MODEL_NOT_CONFIGURED rather than inventing fabricated spoof percentages.
                </div>
              )}
            </div>

            {/* Speaker Verification Architecture */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 font-mono">
                    Speaker Verification Adapter
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {modelHealth.speaker_verification_model.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Representation Model:</span>
                  <span className="text-slate-200 font-semibold">{modelHealth.speaker_verification_model.model_name}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Embedding Dimension:</span>
                  <span className="text-cyan-400 font-bold">
                    {modelHealth.speaker_verification_model.vector_dim}-Dimensional Vector
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Model Version:</span>
                  <span className="text-slate-200">{modelHealth.speaker_verification_model.model_version}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-400">Last Latency:</span>
                  <span className="text-cyan-400 font-bold">
                    {modelHealth.speaker_verification_model.last_latency_ms
                      ? `${modelHealth.speaker_verification_model.last_latency_ms} ms`
                      : 'Operational'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] leading-relaxed">
                <strong>Acoustic Speaker Modeling:</strong> Extracts multi-band spectral filterbank moments, formants, and temporal pitch statistics to compute L2-normalized cosine distance against enrolled profiles.
              </div>
            </div>
          </div>

          {/* Model Limitations & Defense Principles */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 backdrop-blur-md">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Model Limitations & Security Principles (Section 46)</span>
            </h4>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-5 leading-relaxed">
              <li>
                <strong>No 100% Guarantee:</strong> Voice anti-spoofing is a statistical classification, not a cryptographic proof. Advanced adversarial synthesis or unknown neural vocoders can evade individual acoustic models.
              </li>
              <li>
                <strong>Biometric Separation:</strong> Speaker verification proves voice similarity, NOT speech authenticity. A cloned voice sounds identical to the authorized user; therefore, biometric matching must always be fused with anti-spoofing.
              </li>
              <li>
                <strong>Decision-Support Role:</strong> Low model confidence automatically triggers secondary human review or out-of-band verification rather than blindly blocking legitimate callers.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
