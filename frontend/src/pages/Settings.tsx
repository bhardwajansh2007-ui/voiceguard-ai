import React from 'react';
import { Sliders, Shield, Lock, Eye, AlertTriangle } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
          Security Policy & Deployment Configuration
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configurable risk fusion thresholds, retention parameters, and safe integration modes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Risk Thresholds Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Risk Decision Thresholds (0 - 100)
            </h3>
          </div>

          <div className="space-y-3 font-mono">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-emerald-400 font-bold block">LOW RISK (0.0 — 30.0)</span>
                <span className="text-slate-500 text-[11px] font-sans">Permitted by policy. Decision: ALLOW</span>
              </div>
              <span className="text-slate-300 font-bold">30.0</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-amber-400 font-bold block">MEDIUM RISK (30.1 — 60.0)</span>
                <span className="text-slate-500 text-[11px] font-sans">Requires MFA challenge. Decision: ADDITIONAL_VERIFICATION</span>
              </div>
              <span className="text-slate-300 font-bold">60.0</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-orange-400 font-bold block">HIGH RISK (60.1 — 80.0)</span>
                <span className="text-slate-500 text-[11px] font-sans">Requires supervisor callback. Decision: STRONG_VERIFICATION</span>
              </div>
              <span className="text-slate-300 font-bold">80.0</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-rose-400 font-bold block">CRITICAL RISK (80.1 — 100.0)</span>
                <span className="text-slate-500 text-[11px] font-sans">Automated transaction hold. Decision: HOLD_SENSITIVE_ACTION</span>
              </div>
              <span className="text-slate-300 font-bold">100.0</span>
            </div>
          </div>
        </div>

        {/* Multi-Signal Fusion Weights */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Signal Fusion Weights (Sum = 1.0)
            </h3>
          </div>

          <div className="space-y-3 font-mono">
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-300">Acoustic Anti-Spoofing (WEIGHT_SPOOF)</span>
              <span className="text-cyan-400 font-bold">35% (0.35)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-300">Speaker Mismatch (WEIGHT_SPEAKER_MISMATCH)</span>
              <span className="text-cyan-400 font-bold">25% (0.25)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-300">Behavioral & Prosody (WEIGHT_BEHAVIORAL)</span>
              <span className="text-cyan-400 font-bold">15% (0.15)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-300">Caller Identity Context (WEIGHT_CALLER_CONTEXT)</span>
              <span className="text-cyan-400 font-bold">10% (0.10)</span>
            </div>
            <div className="flex justify-between items-center p-2.5 rounded bg-slate-950/80 border border-slate-800">
              <span className="text-slate-300">Transaction Sensitivity (WEIGHT_TRANSACTION)</span>
              <span className="text-cyan-400 font-bold">15% (0.15)</span>
            </div>
          </div>
        </div>

        {/* Privacy by Design & Audio Retention */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Privacy-by-Design & Data Retention
            </h3>
          </div>

          <div className="space-y-2 font-mono text-slate-400 text-[11px]">
            <div className="flex justify-between">
              <span>RAW AUDIO PERSISTENCE:</span>
              <span className="text-emerald-400 font-bold">0 DAYS (EPHEMERAL IN-MEMORY ONLY)</span>
            </div>
            <div className="flex justify-between">
              <span>AUDIT CHAIN RETENTION:</span>
              <span className="text-slate-200">365 DAYS</span>
            </div>
            <div className="flex justify-between">
              <span>BIOMETRIC ENCRYPTION:</span>
              <span className="text-cyan-400">ARGON2ID + SHA-256</span>
            </div>
          </div>
        </div>

        {/* Safe Sandbox Deployment Mode */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Lock className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Safe Deployment Mode
            </h3>
          </div>

          <p className="text-slate-400 text-xs leading-relaxed font-sans">
            In compliance with enterprise security guidelines, the platform operates in isolated sandbox mode:
            all external banking, telecommunication switch, and national identity integrations safely return{' '}
            <strong className="text-cyan-400 font-mono">NOT_CONFIGURED</strong> without mock or simulated production credentials.
          </p>
        </div>
      </div>
    </div>
  );
};
