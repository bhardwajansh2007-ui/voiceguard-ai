import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, FileText, Database, ArrowRight, RefreshCw, Cpu, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { CallSession, CallDetailResponse, AuditEvent } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const RiskInvestigation: React.FC = () => {
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
      console.error('Failed to list calls for investigation:', err);
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
      console.error('Failed to load investigation record:', err);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
            Forensic Risk Investigation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explainable decision intelligence, signal weighting decomposition, and cryptographic audit trace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-400">SESSION:</label>
          <select
            value={selectedCallId}
            onChange={(e) => setSelectedCallId(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none"
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
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {calls.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Investigation Cases Recorded"
          description="There are currently no recorded communication sessions to investigate. As calls are monitored, full forensic breakdowns appear here."
        />
      ) : !callDetail ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          Loading investigation dossier...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Dossier Summary */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 backdrop-blur-md grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">INVESTIGATION TARGET</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{callDetail.call_id}</span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Logged: {new Date(callDetail.created_at).toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">OVERALL IMPERSONATION THREAT</span>
              {callDetail.latest_risk ? (
                <div className="flex items-center gap-2 mt-1">
                  <RiskBadge
                    level={callDetail.latest_risk.risk_level}
                    score={callDetail.latest_risk.overall_risk_score}
                  />
                </div>
              ) : (
                <span className="text-slate-500 font-mono">No analysis computed</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">ENFORCED SECURITY DECISION</span>
              {callDetail.latest_decision ? (
                <div className="font-mono font-semibold text-slate-200 mt-1">
                  {callDetail.latest_decision.decision}
                </div>
              ) : (
                <span className="text-slate-500 font-mono">Pending</span>
              )}
              <div className="text-[10px] text-slate-400">
                Action Status: <strong>{callDetail.latest_decision?.action_status || 'NONE'}</strong>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">TRANSACTION RISK CONTEXT</span>
              <div className="text-slate-200 font-mono mt-1">
                {callDetail.action_type} ({callDetail.action_sensitivity})
              </div>
              <div className="text-slate-400">
                Amount: {callDetail.transaction_amount ? `₹${callDetail.transaction_amount.toLocaleString()}` : 'None'}
              </div>
            </div>
          </div>

          {/* Explainability Engine Reasoning */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Security Decision Explainability Report</span>
            </h3>

            {callDetail.latest_risk ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 font-mono block mb-1">Decision Justification:</span>
                  <p className="text-slate-200 leading-relaxed">
                    {callDetail.latest_decision?.reason || 'No decision rationale logged.'}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 font-mono block mb-2">Contributing Factors:</span>
                  <ul className="space-y-1.5">
                    {callDetail.latest_risk.contributing_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 p-2 rounded bg-slate-950/40 border border-slate-800/50">
                        <span className="text-cyan-400 font-mono">#{i + 1}</span>
                        <span className="text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Normalized Signal Values & Weights */}
                <div className="pt-2">
                  <span className="text-slate-400 font-mono block mb-2">Signal Weights Applied:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[11px]">
                    {Object.entries(callDetail.latest_risk.weights_used).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-slate-950 border border-slate-800 text-center">
                        <div className="text-slate-500 uppercase text-[9px]">{k.replace('weight_', '')}</div>
                        <div className="text-cyan-400 font-bold text-xs mt-0.5">{(v * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs font-mono py-4">
                No risk analysis record is attached to this call session.
              </div>
            )}
          </div>

          {/* Forensic Audit Trace for Session */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Cryptographic Session Trail ({auditTrail.length} Events)</span>
            </h3>

            {auditTrail.length === 0 ? (
              <div className="text-slate-500 text-xs font-mono py-4">
                No audit events recorded for this session.
              </div>
            ) : (
              <div className="space-y-2">
                {auditTrail.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-slate-400 flex items-center justify-center text-[10px] border border-slate-800">
                        {idx + 1}
                      </span>
                      <span className="text-cyan-400 font-semibold">{evt.event_type}</span>
                      <span className="text-slate-500 text-[10px]">({evt.event_id})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Actor: <strong className="text-slate-300">{evt.actor}</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>Hash: <span className="text-emerald-400">{evt.event_hash.slice(0, 10)}...</span></span>
                      <span className="text-slate-600">|</span>
                      <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enterprise Prototype Notice */}
      <PrototypeDisclaimer />
    </div>
  );
};
