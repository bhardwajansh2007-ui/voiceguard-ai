import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  KeyRound,
  AlertCircle,
  PhoneCall,
  UserCheck,
  ShieldX,
  Play,
  CheckCircle2,
  Database,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityDecisionData, ProtectedActionSimulationResult } from '../types';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const SecurityActions: React.FC = () => {
  const [decisions, setDecisions] = useState<SecurityDecisionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<SecurityDecisionData | null>(null);

  // Resolution Form State
  const [actionStatus, setActionStatus] = useState<'RESOLVED_ALLOW' | 'RESOLVED_BLOCKED' | 'OVERRIDDEN'>('RESOLVED_ALLOW');
  const [analystNotes, setAnalystNotes] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Out of band verification state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState('SUPERVISOR_CALLBACK');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  // Protected Action Simulator state
  const [simActionType, setSimActionType] = useState('HIGH_VALUE_WIRE_TRANSFER');
  const [simAmount, setSimAmount] = useState('2500000');
  const [simIdentity, setSimIdentity] = useState('Rahul Sharma (Finance Director)');
  const [simCallerId, setSimCallerId] = useState('+91 98765 43210');
  const [simRiskScore, setSimRiskScore] = useState(88);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ProtectedActionSimulationResult | null>(null);

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const data = await api.security.listDecisions();
      setDecisions(data);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecision) return;
    if (!analystNotes.trim()) {
      setError('Analyst justification notes are required for audit trail.');
      return;
    }

    setResolveLoading(true);
    setError(null);
    try {
      await api.security.resolveDecision(
        selectedDecision.call_id,
        actionStatus,
        analystNotes
      );
      setSelectedDecision(null);
      setAnalystNotes('');
      await loadDecisions();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve decision.');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleInitiateVerification = async () => {
    if (!selectedDecision) return;
    try {
      await api.security.initiateVerification(selectedDecision.call_id, verifyMethod);
      setVerifyMsg(`Independent verification challenge initiated via ${verifyMethod}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate verification.');
    }
  };

  const handleCompleteVerification = async () => {
    if (!selectedDecision || !verifyCode) return;
    try {
      await api.security.completeVerification(selectedDecision.call_id, verifyCode);
      setVerifyMsg('Verification confirmed! Call hold released.');
      setShowVerifyModal(false);
      setSelectedDecision(null);
      await loadDecisions();
    } catch (err: any) {
      setError(err.message || 'Verification confirmation failed.');
    }
  };

  const handleSimulateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    setError(null);

    try {
      const result = await api.security.simulateSensitiveAction({
        action_type: simActionType,
        action_description: `${simActionType} of ₹${simAmount} for ${simIdentity}`,
        simulated_amount: simAmount ? parseFloat(simAmount) : 2500000,
      });
      setSimResult(result);
      await loadDecisions();
    } catch (err: any) {
      setError(err.message || 'Action simulation failed.');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Security Actions & Incident Controls
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              PREVENTION ENCLAVE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time human-in-the-loop prevention console. Enforce automated transaction holds, trigger secondary verification, or simulate high-value interventions.
          </p>
        </div>

        <button
          onClick={loadDecisions}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition"
          title="Refresh Decision Telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* 5 Response Options Reference Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-2">
          Enclave Defense Interventions
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-rose-500/30">
            <div className="text-rose-400 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              1. Hold Action
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Freezes wire transfers or approvals pending out-of-band authorization.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-cyan-500/30">
            <div className="text-cyan-300 font-bold flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5" />
              2. Secure Callback
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Directs verified callback to executive's pre-registered number.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-500/30">
            <div className="text-amber-400 font-bold flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              3. Request MFA
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Dispatches cryptographic push prompt or hardware token challenge.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-purple-500/30">
            <div className="text-purple-300 font-bold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              4. Escalate Analyst
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Routes incident to SOC security officer for forensic review.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-red-500/40">
            <div className="text-red-400 font-bold flex items-center gap-1">
              <ShieldX className="w-3.5 h-3.5" />
              5. Block & Drop
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Terminates telecom socket and blacklists caller ID in registry.
            </p>
          </div>
        </div>
      </div>

      {/* Protected Action Simulator Harness */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/60 to-slate-900/70 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
              Interactive Protected Action Simulator (Test Intervention Console)
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
            SANDBOX SIMULATION
          </span>
        </div>

        <form onSubmit={handleSimulateAction} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Action Type</label>
            <input
              type="text"
              value={simActionType}
              onChange={(e) => setSimActionType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Transfer Amount (₹)</label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Claimed Identity</label>
            <input
              type="text"
              value={simIdentity}
              onChange={(e) => setSimIdentity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="block text-[10px] text-slate-400 uppercase mb-1">
              Threat Score: <strong className="text-cyan-300">{simRiskScore}/100</strong>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={simRiskScore}
              onChange={(e) => setSimRiskScore(parseInt(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>

          <div className="md:col-span-4 flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400">
              Tests automated enclave action lock (&ge;80 = HOLD, 61-80 = MFA, &le;60 = ALLOW).
            </div>
            <button
              type="submit"
              disabled={simLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase rounded-lg shadow-md shadow-cyan-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {simLoading ? 'Simulating...' : 'Simulate Action Hold'}
            </button>
          </div>
        </form>

        {simResult && (
          <div className="mt-3 p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/40 text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Action Simulation Result:
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase ${
                  simResult.status === 'HOLD'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : simResult.decision === 'ADDITIONAL_VERIFICATION'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}
              >
                {simResult.decision}
              </span>
            </div>

            <p className="text-slate-300 text-[11px]">{simResult.message}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span>Session ID: <strong className="text-cyan-300">{simResult.call_id}</strong></span>
              <span>Evaluated Risk: <strong className="text-amber-400">{simResult.risk_score}/100</strong></span>
              <span>Enforced Requirement: <strong className="text-emerald-400">{simResult.required_action}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Decisions List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
          Held Actions & Security Decisions
        </h3>

        {decisions.length === 0 && !loading ? (
          <EmptyState
            icon={ShieldAlert}
            title="No Active Holds"
            description="All monitored calls are currently in compliance. When a high-risk interaction triggers a hold, it will appear here for analyst disposition."
          />
        ) : (
          <div className="space-y-3">
            {decisions.map((dec) => {
              const isHeld = dec.action_status === 'PENDING';
              return (
                <div
                  key={dec.id}
                  className={`p-4 rounded-lg border text-xs font-mono transition ${
                    isHeld
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/20'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-cyan-300">{dec.call_id}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            dec.action_status === 'PENDING'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : dec.action_status === 'RESOLVED_ALLOW'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {dec.action_status}
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs mt-1">
                        Decision: <strong>{dec.decision}</strong>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{dec.reason}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isHeld && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedDecision(dec);
                              setShowVerifyModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 cursor-pointer flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Dispatch MFA</span>
                          </button>
                          <button
                            onClick={() => setSelectedDecision(dec)}
                            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer"
                          >
                            Resolve Hold
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Out of Band Verification Modal */}
      {showVerifyModal && selectedDecision && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 uppercase">Dispatch Secondary Verification</span>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <p className="text-slate-300 text-[11px]">
                Target Session: <strong className="text-cyan-300">{selectedDecision.call_id}</strong>
              </p>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Verification Channel</label>
                <select
                  value={verifyMethod}
                  onChange={(e) => setVerifyMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                >
                  <option value="SUPERVISOR_CALLBACK">Supervisor Callback to Registered Number</option>
                  <option value="CRYPTOGRAPHIC_PUSH">Out-of-Band Cryptographic Push Prompt</option>
                  <option value="HARDWARE_TOKEN">Hardware Security Token Challenge</option>
                </select>
              </div>

              <button
                onClick={handleInitiateVerification}
                className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase cursor-pointer"
              >
                Transmit Verification Challenge
              </button>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Enter Received Response Token</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="e.g. 849201"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  />
                  <button
                    onClick={handleCompleteVerification}
                    className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold uppercase cursor-pointer"
                  >
                    Confirm & Release
                  </button>
                </div>
              </div>

              {verifyMsg && (
                <div className="p-2.5 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-[11px]">
                  {verifyMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Resolve Modal */}
      {selectedDecision && !showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 uppercase">Analyst Disposition & Resolution</span>
              <button onClick={() => setSelectedDecision(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Resolution Action</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                >
                  <option value="RESOLVED_ALLOW">RESOLVED_ALLOW (Authorize Action Execution)</option>
                  <option value="RESOLVED_BLOCKED">RESOLVED_BLOCKED (Block & Terminate Interaction)</option>
                  <option value="OVERRIDDEN">OVERRIDDEN (Supervisor Security Override)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Audit Justification Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  placeholder="Explain out-of-band verification findings or reason for security override..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDecision(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveLoading}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  {resolveLoading ? 'Signing...' : 'Sign & Record in Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Disclaimer */}
      <PrototypeDisclaimer />
    </div>
  );
};
