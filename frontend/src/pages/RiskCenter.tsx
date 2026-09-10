import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldAlert,
  FileText,
  Database,
  ArrowRight,
  RefreshCw,
  Cpu,
  CheckCircle,
  Sliders,
  Shield,
  Layers,
  AlertOctagon,
  Percent,
} from 'lucide-react';
import { api } from '../services/api';
import { CallSession, CallDetailResponse, AuditEvent } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const RiskCenter: React.FC = () => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>('');
  const [callDetail, setCallDetail] = useState<CallDetailResponse | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCalls = async () => {
    try {
      const data = await api.calls.list();
      setCalls(data);
      if (data.length > 0 && !selectedCallId) {
        setSelectedCallId(data[0].call_id);
      }
    } catch (err) {
      console.error('Failed to list calls for risk analysis:', err);
    }
  };

  const loadInvestigationData = async (callId: string) => {
    if (!callId) return;
    setLoading(true);
    try {
      const [detailData, trailData] = await Promise.all([
        api.calls.get(callId),
        api.audit.getCallTrail(callId),
      ]);
      setCallDetail(detailData);
      setAuditTrail(trailData);
    } catch (err) {
      console.error('Failed to load risk record:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    if (selectedCallId) {
      loadInvestigationData(selectedCallId);
    }
  }, [selectedCallId]);

  const risk = callDetail?.latest_risk;
  const decision = callDetail?.latest_decision;

  // 5 Signal weights and values
  const sigVals = risk?.signal_values || {};
  const signals = [
    {
      id: 'voice_authenticity',
      name: 'Voice Authenticity (Anti-Spoof)',
      weight: 40,
      description: 'AASIST neural spectral artifact detection. Flags synthetic, cloned, or replay audio.',
      score: risk ? Math.round(sigVals.spoof_risk || 0) : null,
      weighted: risk ? Math.round((sigVals.spoof_risk || 0) * 0.40) : null,
    },
    {
      id: 'speaker_anomaly',
      name: 'Speaker Biometric Anomaly',
      weight: 25,
      description: 'ECAPA-TDNN embedding cosine distance versus reference enrolled biometric profile.',
      score: risk ? Math.round(sigVals.speaker_mismatch || 0) : null,
      weighted: risk ? Math.round((sigVals.speaker_mismatch || 0) * 0.25) : null,
    },
    {
      id: 'caller_risk',
      name: 'Caller Context & Reputation',
      weight: 15,
      description: 'ANI/SIP channel validation, number history, carrier anomaly, unassigned range checks.',
      score: risk ? Math.round(sigVals.caller_risk || 0) : null,
      weighted: risk ? Math.round((sigVals.caller_risk || 0) * 0.15) : null,
    },
    {
      id: 'transaction_risk',
      name: 'Transaction & Action Sensitivity',
      weight: 10,
      description: 'Financial exposure level, approval authority ceilings, and operation criticality.',
      score: risk ? Math.round(sigVals.transaction_risk || 0) : null,
      weighted: risk ? Math.round((sigVals.transaction_risk || 0) * 0.10) : null,
    },
    {
      id: 'behavioral_risk',
      name: 'Behavioral & Conversational Risk',
      weight: 10,
      description: 'Urgency velocity indicators, prompt deviation patterns, social engineering markers.',
      score: risk ? Math.round(sigVals.behavioral_risk || 0) : null,
      weighted: risk ? Math.round((sigVals.behavioral_risk || 0) * 0.10) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Risk Center & Explainability Engine
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              5-SIGNAL FUSION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Decomposed threat analysis. Combines acoustic spoofing, speaker verification distance, caller reputation, and transaction criticality.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-400">SESSION:</label>
          <select
            value={selectedCallId}
            onChange={(e) => setSelectedCallId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer"
          >
            {calls.map((c) => (
              <option key={c.call_id} value={c.call_id}>
                {c.call_id} — {c.action_type} ({c.status})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadInvestigationData(selectedCallId)}
            className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer"
            title="Refresh Session Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Thresholds Reference Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
          Standard Enterprise Risk Thresholds & Enclave Policies
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-emerald-500/30">
            <div className="text-emerald-400 font-bold">0 — 30 &bull; LOW</div>
            <div className="text-slate-300 text-[11px] font-semibold mt-0.5">Policy: ALLOW</div>
            <div className="text-[10px] text-slate-500 mt-1">Authentic acoustic match, normal caller context</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-blue-500/30">
            <div className="text-cyan-300 font-bold">31 — 60 &bull; MEDIUM</div>
            <div className="text-slate-300 text-[11px] font-semibold mt-0.5">Policy: VERIFY</div>
            <div className="text-[10px] text-slate-500 mt-1">Minor acoustic variance or unverified caller channel</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-500/30">
            <div className="text-amber-400 font-bold">61 — 80 &bull; HIGH</div>
            <div className="text-slate-300 text-[11px] font-semibold mt-0.5">Policy: STEP-UP MFA</div>
            <div className="text-[10px] text-slate-500 mt-1">Biometric anomaly or high-value action detected</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-rose-500/30">
            <div className="text-rose-400 font-bold">81 — 100 &bull; CRITICAL</div>
            <div className="text-slate-300 text-[11px] font-semibold mt-0.5">Policy: HOLD SENSITIVE ACTION</div>
            <div className="text-[10px] text-slate-500 mt-1">Synthetic voice clone or severe identity fraud</div>
          </div>
        </div>
      </div>

      {calls.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Sessions Recorded"
          description="Start a session in Protected Calls or Live Protection to view 5-signal risk fusion breakdown."
        />
      ) : !callDetail ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          Loading risk assessment dossier...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Dossier Summary */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-md grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">FOCUS CALL SESSION</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{callDetail.call_id}</span>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Claimed: <strong>{callDetail.claimed_identity || 'External Unregistered'}</strong>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">OVERALL RISK SCORE (0-100)</span>
              {risk ? (
                <div className="flex items-center gap-2 mt-1">
                  <RiskBadge
                    level={risk.risk_level}
                    score={risk.overall_risk_score}
                  />
                </div>
              ) : (
                <span className="text-slate-500 font-mono">No analysis computed</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">ACTIVE ENCLAVE DECISION</span>
              {decision ? (
                <div className="font-mono font-semibold text-slate-200 mt-1">
                  {decision.decision}
                </div>
              ) : (
                <span className="text-slate-500 font-mono">Pending</span>
              )}
              <div className="text-[10px] text-slate-400 font-mono">
                Status: <strong>{decision?.action_status || 'ACTIVE'}</strong>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">ACTION & SENSITIVITY</span>
              <div className="text-slate-200 font-mono mt-1">
                {callDetail.action_type} ({callDetail.action_sensitivity})
              </div>
              <div className="text-amber-400 font-mono text-[11px] mt-0.5">
                {callDetail.transaction_amount ? `₹${callDetail.transaction_amount.toLocaleString()}` : 'No monetary value'}
              </div>
            </div>
          </div>

          {/* 5-Signal Breakdown Cards */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>5-Signal Risk Fusion Breakdown</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Total Weighted Risk: <strong className="text-cyan-400">{risk ? Math.round(risk.overall_risk_score) : '—'}/100</strong>
              </span>
            </div>

            <div className="space-y-3">
              {signals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono text-xs space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{sig.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {sig.weight}% Weight
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-slate-400">
                        Signal Score: <strong className="text-slate-200">{sig.score !== null ? `${sig.score}/100` : 'Pending'}</strong>
                      </span>
                      <span className="text-cyan-400 font-bold">
                        Contribution: +{sig.weighted !== null ? sig.weighted : 0} pts
                      </span>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        (sig.score || 0) > 70
                          ? 'bg-rose-500'
                          : (sig.score || 0) > 40
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${sig.score || 0}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 font-sans">
                    {sig.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Explainability Engine Rationale & Contributing Factors */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Decision Justification & Contributing Factors</span>
            </h3>

            {risk ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] block mb-1">AUTOMATED ENCLAVE JUSTIFICATION</span>
                  <p className="text-slate-200 leading-relaxed font-sans text-xs">
                    {decision?.reason || 'Decision evaluated according to 5-signal risk fusion policy.'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] block mb-2">PRIMARY CONTRIBUTING FACTORS</span>
                  <div className="space-y-1.5">
                    {risk.contributing_factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded bg-slate-950/40 border border-slate-800/60"
                      >
                        <span className="text-cyan-400 font-bold">#{idx + 1}</span>
                        <span className="text-slate-300 font-sans text-xs">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs font-mono py-2">
                Inference telemetry pending for this session.
              </div>
            )}
          </div>

          {/* Forensic Audit Trace for Session */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Session Cryptographic Ledger Trace ({auditTrail.length} Events)</span>
            </h3>

            {auditTrail.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono py-2">
                No ledger blocks recorded for this session yet.
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {auditTrail.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="text-emerald-400 font-bold uppercase">{ev.event_type}</span>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        {ev.payload?.action_taken || ev.payload?.decision || ev.payload?.description || ev.event_type}
                      </div>
                      <div className="text-slate-500 text-[10px]">{new Date(ev.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className="text-[10px] text-slate-500 block uppercase">SHA-256 HASH</span>
                      <span className="text-[10px] text-slate-400">{ev.event_hash.substring(0, 16)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Platform Disclaimer */}
      <PrototypeDisclaimer />
    </div>
  );
};
