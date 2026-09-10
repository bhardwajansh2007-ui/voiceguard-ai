import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, AlertOctagon, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../services/api';
import { AuditEvent, AuditChainVerification } from '../types';
import { EmptyState } from '../components/EmptyState';

export const AuditLedger: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verification, setVerification] = useState<AuditChainVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const [eventsData, verifData] = await Promise.all([
        api.audit.list(),
        api.audit.verifyChain(),
      ]);
      setEvents(eventsData);
      setVerification(verifData);
    } catch (err) {
      console.error('Failed to load audit ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const report = await api.audit.verifyChain();
      setVerification(report);
    } catch (err) {
      console.error('Failed to verify chain:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0 flex items-center gap-2">
            <span>Cryptographic Audit Ledger</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-mono">
              TAMPER-EVIDENT HASH CHAIN
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Forensic audit trail linking security holds, biometric verifications, and ML risk assessments via SHA-256 hash pointers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAuditData}
            title="Refresh Ledger"
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-emerald-600/20 transition-all cursor-pointer font-mono"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? 'Traversing Hashes...' : 'Verify Chain Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`p-4 rounded-xl border backdrop-blur-md flex items-start gap-3 text-xs ${
            verification.is_valid
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
          }`}
        >
          {verification.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold font-mono text-sm">
              {verification.is_valid ? 'CRYPTOGRAPHIC INTEGRITY: INTACT' : 'TAMPERING DETECTED IN LEDGER CHAIN'}
            </div>
            <p className="text-slate-300 font-sans">{verification.verification_message}</p>
            <div className="text-[11px] font-mono opacity-80">
              Total Blocks Audited: <strong>{verification.total_events_checked}</strong> | Genesis Hash: VERIFIED |
              Verified At: {new Date(verification.verified_at).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Event List / Empty State */}
      {events.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No Audit Events"
          description="The cryptographic ledger contains zero security events. As authentication, enrollment, and risk events occur, append-only blocks form here."
        />
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono uppercase text-slate-400">
              Sequential Hash Chained Blocks ({events.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Format: SHA-256(prev_hash + type + timestamp + payload_hash)
            </span>
          </div>

          <div className="space-y-3">
            {events.map((evt, idx) => (
              <div
                key={evt.id}
                className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-400 font-bold border border-slate-800">
                      BLOCK #{events.length - idx}
                    </span>
                    <span className="text-slate-100 font-semibold">{evt.event_type}</span>
                    <span className="text-slate-500 text-[11px]">({evt.event_id})</span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Actor: <strong className="text-slate-200">{evt.actor}</strong></span>
                    <span>{new Date(evt.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-900/50 p-2.5 rounded border border-slate-800/60">
                  <div className="truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">PREVIOUS BLOCK HASH:</span>
                    <span className="text-slate-400 font-mono">{evt.previous_event_hash}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500 block text-[9px] uppercase">BLOCK EVENT HASH:</span>
                    <span className="text-emerald-400 font-mono">{evt.event_hash}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  <span className="text-slate-500 text-[9px] uppercase block">CANONICAL PAYLOAD:</span>
                  <pre className="mt-1 p-2 rounded bg-black/40 text-slate-300 overflow-x-auto text-[10px]">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
