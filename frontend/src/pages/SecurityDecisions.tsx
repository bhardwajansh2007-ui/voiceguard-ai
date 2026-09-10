import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Clock, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { SecurityDecisionData } from '../types';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const SecurityDecisions: React.FC = () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
            Security Decisions & Action Controls
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Human-in-the-loop prevention console. Review held transactions, dispatch secondary verification, or authorize release.
          </p>
        </div>

        <button
          onClick={loadDecisions}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {decisions.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Security Incidents Recorded"
          description="Zero security policy interventions or holds recorded in the database. When live calls trigger high impersonation risk, they are placed on hold and queued here."
        />
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-mono text-slate-400 bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Policy Decision</th>
                  <th className="py-2.5 px-3">Mandated Action</th>
                  <th className="py-2.5 px-3">Intervention Status</th>
                  <th className="py-2.5 px-3">Resolved By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {decisions.map((dec) => (
                  <tr key={dec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-cyan-400 font-bold">{dec.call_id}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          dec.decision === 'HOLD_SENSITIVE_ACTION'
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {dec.decision}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">{dec.required_action}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          dec.action_status === 'PENDING'
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40 animate-pulse'
                            : dec.action_status === 'RESOLVED_ALLOW'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {dec.action_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {dec.resolved_by ? `${dec.resolved_by}` : 'Unresolved'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {dec.action_status === 'PENDING' ? (
                        <button
                          onClick={() => {
                            setSelectedDecision(dec);
                            setError(null);
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold uppercase text-[10px] rounded cursor-pointer transition-colors"
                        >
                          Resolve Hold
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resolution & Verification Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Security Decision Control — {selectedDecision.call_id}</span>
              </h3>
              <button
                onClick={() => setSelectedDecision(null)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {verifyMsg && (
              <div className="p-3 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-xs">
                {verifyMsg}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-950 text-xs space-y-1 font-mono text-slate-300">
              <div><strong>Active Decision:</strong> {selectedDecision.decision}</div>
              <div><strong>Policy Reason:</strong> {selectedDecision.reason}</div>
              <div><strong>Required Action:</strong> {selectedDecision.required_action}</div>
            </div>

            {/* Verification trigger option */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
              <span className="font-mono text-slate-400 uppercase block font-semibold">
                Option 1: Out-of-Band Independent Verification
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={verifyMethod}
                  onChange={(e) => setVerifyMethod(e.target.value)}
                  className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs"
                >
                  <option value="SUPERVISOR_CALLBACK">Supervisor Callback</option>
                  <option value="MFA_CHALLENGE">MFA Push Challenge</option>
                  <option value="SECONDARY_CHANNEL">Secondary Secure Channel</option>
                </select>
                <button
                  type="button"
                  onClick={handleInitiateVerification}
                  className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-400 rounded font-mono text-xs cursor-pointer"
                >
                  Dispatch Challenge
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Verification Response Code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleCompleteVerification}
                  className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-400 rounded font-mono text-xs cursor-pointer"
                >
                  Confirm & Release
                </button>
              </div>
            </div>

            {/* Direct Analyst Override Form */}
            <form onSubmit={handleResolve} className="space-y-3 text-xs">
              <span className="font-mono text-slate-400 uppercase block font-semibold">
                Option 2: Direct Analyst Resolution / Override
              </span>

              <div>
                <label className="block font-mono text-slate-400 mb-1">Resolution Action</label>
                <select
                  value={actionStatus}
                  onChange={(e: any) => setActionStatus(e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                >
                  <option value="RESOLVED_ALLOW">RESOLVED_ALLOW (Authorize & Release Hold)</option>
                  <option value="RESOLVED_BLOCKED">RESOLVED_BLOCKED (Block & Terminate Session)</option>
                  <option value="OVERRIDDEN">OVERRIDDEN (Supervisor Manual Override)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-slate-400 mb-1">Analyst Justification Notes</label>
                <textarea
                  required
                  rows={3}
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  placeholder="Enter analyst verification justification notes..."
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDecision(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-semibold rounded cursor-pointer"
                >
                  {resolveLoading ? 'Recording Resolution...' : 'Apply Security Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Prototype Notice */}
      <PrototypeDisclaimer />
    </div>
  );
};
