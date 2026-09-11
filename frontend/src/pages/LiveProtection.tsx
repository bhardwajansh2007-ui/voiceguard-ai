import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Radio,
  Lock,
  RefreshCw,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  ArrowUpRight,
  Fingerprint,
} from 'lucide-react';
import { api } from '../services/api';
import { CallSession, CallDetailResponse } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { SignalBreakdownCard } from '../components/SignalBreakdownCard';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

interface LiveProtectionProps {
  initialCallId?: string;
  onNavigateToSandbox: (callId?: string) => void;
  onNavigateToDecisions: () => void;
}

export const LiveProtection: React.FC<LiveProtectionProps> = ({
  initialCallId,
  onNavigateToSandbox,
  onNavigateToDecisions,
}) => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>(initialCallId || '');
  const [callDetail, setCallDetail] = useState<CallDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (initialCallId) {
      setSelectedCallId(initialCallId);
    }
  }, [initialCallId]);

  useEffect(() => {
    if (selectedCallId) {
      loadSessionDetail(selectedCallId);
      const interval = setInterval(() => {
        loadSessionDetail(selectedCallId, true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedCallId]);

  const loadSessions = async () => {
    try {
      const data = await api.calls.list();
      setCalls(data);
      if (!selectedCallId && data.length > 0) {
        setSelectedCallId(data[0].call_id);
      }
    } catch (err) {
      console.error('Failed to load protected sessions:', err);
    }
  };

  const loadSessionDetail = async (callId: string, silent = false) => {
    if (!callId) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.calls.get(callId);
      setCallDetail(data);
    } catch (err) {
      console.error('Failed to get session details:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleResolveAction = async (status: string, note: string) => {
    if (!selectedCallId) return;
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await api.security.resolveDecision(selectedCallId, status, note);
      setActionFeedback({
        type: 'success',
        message: `Session action updated to ${status}. Logged to SHA-256 audit chain.`,
      });
      await loadSessionDetail(selectedCallId);
      await loadSessions();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Failed to update security action.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const currentRisk = callDetail?.latest_risk
    ? {
        overall_risk_score: callDetail.latest_risk.overall_risk_score,
        risk_level: callDetail.latest_risk.risk_level,
        contributing_factors: callDetail.latest_risk.contributing_factors,
        signals: callDetail.latest_risk.signal_values,
      }
    : null;

  const currentDecision = callDetail?.latest_decision
    ? {
        decision: callDetail.latest_decision.decision,
        reason: callDetail.latest_decision.reason,
        required_action: callDetail.latest_decision.required_action,
      }
    : null;

  const getSourceBadge = (sourceType?: string) => {
    switch (sourceType) {
      case 'MICROPHONE':
        return { label: 'LOCAL MICROPHONE', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' };
      case 'AUDIO_UPLOAD':
        return { label: 'AUDIO UPLOAD / FORENSIC', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
      case 'EXTERNAL_INTEGRATION':
        return { label: 'EXTERNAL PBX / SIP', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40' };
      case 'COMMUNICATION_SANDBOX':
      default:
        return { label: 'COMMUNICATION SANDBOX', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Console Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Live Protection Console
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/60 font-semibold">
              SOC FLAGSHIP
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric integrity evaluation, synthetic voice detection, and autonomous policy enforcement
          </p>
        </div>

        {/* Controls & Session Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToSandbox(selectedCallId)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 text-xs font-mono rounded-lg border border-cyan-500/40 shadow-sm transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Ingestion Sandbox</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <select
              value={selectedCallId}
              onChange={(e) => setSelectedCallId(e.target.value)}
              className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none max-w-[220px]"
            >
              {calls.map((c) => (
                <option key={c.call_id} value={c.call_id} className="bg-slate-900 text-slate-200">
                  {c.call_id} — {c.action_type}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                loadSessions();
                if (selectedCallId) loadSessionDetail(selectedCallId);
              }}
              title="Refresh Telemetry"
              className="p-1 text-slate-400 hover:text-cyan-400 rounded cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-slate-200 uppercase">
              No Active Protected Sessions
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              VoiceGuard is standing by. Initialize a monitored session via the Communication Sandbox to begin live biometric defense and synthetic voice screening.
            </p>
          </div>
          <button
            onClick={() => onNavigateToSandbox()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold font-mono text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <span>Launch Ingestion Sandbox</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Session Context Bar */}
          {callDetail && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">SESSION IDENTIFIER</span>
                <span className="font-bold text-cyan-400 text-sm">{callDetail.call_id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">INGESTION SOURCE</span>
                <span
                  className={`inline-block text-[10px] px-2 py-0.5 mt-0.5 rounded border font-semibold ${
                    getSourceBadge(callDetail.source_type).color
                  }`}
                >
                  {getSourceBadge(callDetail.source_type).label}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">CLAIMED IDENTITY</span>
                <span className="text-slate-200 font-semibold">
                  {callDetail.claimed_identity ? (
                    <span className="text-cyan-300 flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                      {callDetail.claimed_identity}
                    </span>
                  ) : (
                    'UNCLAIMED / ANONYMOUS'
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">PROTECTED ACTION</span>
                <span className="text-slate-200 font-semibold">{callDetail.action_type}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">EXPOSURE VALUE</span>
                <span className="text-slate-200 font-semibold">
                  {callDetail.transaction_amount
                    ? `₹${callDetail.transaction_amount.toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">DEFENSE STATE</span>
                <span
                  className={`inline-block px-2 py-0.5 mt-0.5 rounded font-bold ${
                    callDetail.status === 'HOLD'
                      ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      : callDetail.status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {callDetail.status === 'HOLD'
                    ? 'ACTION PLACED ON HOLD'
                    : callDetail.status === 'VERIFIED'
                    ? 'VERIFIED / CLEARED'
                    : callDetail.status}
                </span>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {actionFeedback && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
          )}

          {/* Main SOC Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Signal Breakdown & Acoustic Diagnostics */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                      Acoustic & Biometric Telemetry
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Live Session Feed: {selectedCallId}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Signal Ingestion Pipeline: Active</span>
                  </div>
                  <button
                    onClick={() => onNavigateToSandbox(selectedCallId)}
                    className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer text-[11px]"
                  >
                    Adjust Stream Ingestion →
                  </button>
                </div>

                <SignalBreakdownCard
                  signals={currentRisk?.signals}
                  weights={callDetail?.latest_risk?.weights_used}
                  antiSpoofStatus={callDetail?.latest_analysis?.anti_spoof_status}
                  speakerStatus={callDetail?.latest_analysis?.speaker_verification_status}
                />
              </div>

              {/* Forensic Details */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>Biometric & Forensic Diagnostics</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] uppercase block">SPEAKER SIMILARITY</span>
                      {callDetail?.latest_analysis?.speaker_similarity !== undefined && callDetail?.latest_analysis?.speaker_similarity !== null && (
                        <span className={`text-[10px] font-bold ${callDetail.latest_analysis.speaker_similarity >= 0.88 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {callDetail.latest_analysis.speaker_similarity >= 0.88 ? 'MATCH' : 'MISMATCH'}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-slate-200 flex items-baseline gap-1.5">
                      {callDetail?.latest_analysis?.speaker_similarity !== undefined && callDetail?.latest_analysis?.speaker_similarity !== null
                        ? `${callDetail.latest_analysis.speaker_similarity.toFixed(3)}`
                        : 'PENDING ENROLLMENT'}
                      {callDetail?.latest_analysis?.speaker_similarity !== undefined && callDetail?.latest_analysis?.speaker_similarity !== null && (
                        <span className="text-xs text-slate-500 font-normal">cosine</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Cosine similarity against reference vector (128-D Vector, Threshold: 0.880 · Similarity ≠ Probability)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase block">VOICE AUTHENTICITY CONFIDENCE</span>
                    <div className="text-lg font-bold text-slate-200">
                      {callDetail?.latest_analysis?.genuine_probability !== undefined && callDetail?.latest_analysis?.genuine_probability !== null
                        ? `${(callDetail.latest_analysis.genuine_probability * 100).toFixed(1)}% Genuine`
                        : callDetail?.latest_analysis?.anti_spoof_status || 'MODEL_NOT_CONFIGURED'}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Acoustic artifact and synthetic phase analysis (AASIST SincNet Graph Network)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Fused Risk Score, Policy Decision */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                    Fused Threat Score
                  </h3>
                  {currentRisk ? (
                    <RiskBadge level={currentRisk.risk_level} score={currentRisk.overall_risk_score} />
                  ) : (
                    <span className="text-xs font-mono text-slate-500">NO ANALYSIS</span>
                  )}
                </div>

                {currentRisk ? (
                  <div className="text-center py-4">
                    <div className="text-5xl font-black font-mono tracking-tight text-slate-100">
                      {currentRisk.overall_risk_score.toFixed(1)}
                      <span className="text-xl text-slate-500 font-normal"> / 100</span>
                    </div>
                    <div className="text-xs font-mono uppercase mt-2 text-slate-400">
                      Evaluated Threat: <strong className="text-cyan-400">{currentRisk.risk_level}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono">
                    No threat analysis recorded. Process audio in Communication Sandbox to evaluate risk.
                  </div>
                )}

                {currentRisk?.contributing_factors && currentRisk.contributing_factors.length > 0 && (
                  <div className="pt-3 border-t border-slate-800/60">
                    <span className="text-[11px] font-mono uppercase text-slate-400 block mb-2">
                      Contributing Threat Signals:
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {currentRisk.contributing_factors.map((factor, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Policy Decision & Action Controls */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                    Security Policy Decision
                  </h3>
                  <Lock className="w-4 h-4 text-cyan-400" />
                </div>

                {currentDecision ? (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded-lg border font-mono text-xs font-semibold flex items-center gap-2.5 ${
                        currentDecision.decision === 'HOLD_SENSITIVE_ACTION'
                          ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          : currentDecision.decision === 'STRONG_VERIFICATION'
                          ? 'bg-orange-950/60 text-orange-300 border-orange-500/40'
                          : currentDecision.decision === 'ADDITIONAL_VERIFICATION'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{currentDecision.decision.replace(/_/g, ' ')}</span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/40">
                      {currentDecision.reason}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 font-mono">
                    No active policy enforcement trigger.
                  </div>
                )}

                {/* SOC Manual Overrides */}
                <div className="pt-3 border-t border-slate-800/60 space-y-2 font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                    SOC Manual Overrides:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleResolveAction('HOLD', 'Analyst flagged critical impersonation anomaly.')}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded font-semibold text-[11px] transition cursor-pointer text-center"
                    >
                      Hold Action
                    </button>
                    <button
                      onClick={() => handleResolveAction('VERIFIED', 'Manual analyst identity check passed.')}
                      disabled={actionLoading}
                      className="px-3 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded font-semibold text-[11px] transition cursor-pointer text-center"
                    >
                      Clear / Approve
                    </button>
                  </div>
                  <button
                    onClick={onNavigateToDecisions}
                    className="w-full text-center text-cyan-400 hover:text-cyan-300 text-[11px] pt-1 block cursor-pointer"
                  >
                    View All Security Actions & Out-of-Band Challenges →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Prototype Notice */}
      <PrototypeDisclaimer />
    </div>
  );
};
