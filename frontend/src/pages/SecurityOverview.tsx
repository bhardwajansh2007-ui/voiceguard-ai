import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  Users,
  Database,
  ArrowUpRight,
  RefreshCw,
  Shield,
  Activity,
  Terminal,
} from 'lucide-react';
import { api } from '../services/api';
import { CallSession, SystemHealth, SecurityDecisionData } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

interface SecurityOverviewProps {
  onNavigateToLiveProtection: (callId?: string) => void;
  onNavigateToSandbox: (callId?: string) => void;
  onNavigateToSpeakers: () => void;
  onNavigateToAudit: () => void;
  onNavigateToDecisions: () => void;
}

export const SecurityOverview: React.FC<SecurityOverviewProps> = ({
  onNavigateToLiveProtection,
  onNavigateToSandbox,
  onNavigateToSpeakers,
  onNavigateToAudit,
  onNavigateToDecisions,
}) => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [decisions, setDecisions] = useState<SecurityDecisionData[]>([]);
  const [speakerCount, setSpeakerCount] = useState(0);
  const [auditEventCount, setAuditEventCount] = useState(0);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [callsData, decData, speakersData, auditData, healthData] = await Promise.all([
        api.calls.list(),
        api.security.listDecisions(),
        api.speakers.list(),
        api.audit.list(),
        api.health.getSystemHealth(),
      ]);
      setCalls(callsData);
      setDecisions(decData);
      setSpeakerCount(speakersData.length);
      setAuditEventCount(auditData.length);
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingHolds = decisions.filter((d) => d.action_status === 'PENDING').length;
  const activeSessions = calls.filter((c) => c.status === 'ACTIVE' || c.status === 'HOLD').length;

  const getSourceBadge = (sourceType?: string) => {
    switch (sourceType) {
      case 'MICROPHONE':
        return { label: 'MIC', color: 'bg-emerald-950 text-emerald-400 border-emerald-500/30' };
      case 'AUDIO_UPLOAD':
        return { label: 'UPLOAD', color: 'bg-purple-950 text-purple-300 border-purple-500/30' };
      case 'EXTERNAL_INTEGRATION':
        return { label: 'PBX / SIP', color: 'bg-indigo-950 text-indigo-300 border-indigo-500/30' };
      case 'COMMUNICATION_SANDBOX':
      default:
        return { label: 'SANDBOX', color: 'bg-cyan-950 text-cyan-300 border-cyan-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Security Operations Overview
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric integrity evaluation, anti-spoof synthetic voice screening, and automated action hold enforcement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Live Telemetry"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => onNavigateToSandbox()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs font-mono uppercase rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Sandbox</span>
          </button>
          <button
            onClick={() => onNavigateToLiveProtection()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>Live Protection SOC</span>
          </button>
        </div>
      </div>

      {/* Enterprise Platform Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900/70 to-slate-900/60 border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-950/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
              Enterprise Voice Security Enclave
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              VoiceGuard AI evaluates <strong>caller intelligence</strong>, <strong>voice authenticity</strong>, <strong>speaker identity</strong>, and <strong>interaction risk</strong> to safeguard sensitive actions against voice cloning and social engineering.
            </p>
          </div>
        </div>
      </div>

      {/* 8 Real Enterprise Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. System Posture */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">1. System Posture</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-400">
            {health?.status === 'HEALTHY' ? 'OPERATIONAL' : 'ENCLAVE ACTIVE'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Zero-Trust Biometric Perimeter
          </div>
        </div>

        {/* 2. Active Protected Calls */}
        <div
          onClick={() => onNavigateToLiveProtection()}
          className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">2. Active Calls</span>
            <Radio className={`w-3.5 h-3.5 ${activeSessions > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">{activeSessions}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {calls.length} total monitored sessions
          </div>
        </div>

        {/* 3. Verified Callers */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">3. Verified Callers</span>
            <Shield className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-teal-400">
            {calls.filter((c) => c.status === 'VERIFIED').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Biometrically Authenticated
          </div>
        </div>

        {/* 4. High-Risk Callers */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">4. High-Risk Callers</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {calls.filter((c) => c.status === 'HOLD' || c.action_sensitivity === 'CRITICAL').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Impersonation threat / Hold
          </div>
        </div>

        {/* 5. Actions on Hold */}
        <div
          onClick={onNavigateToDecisions}
          className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">5. Actions on Hold</span>
            <ShieldAlert className={`w-3.5 h-3.5 ${pendingHolds > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">{pendingHolds}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            High-risk transactions locked
          </div>
        </div>

        {/* 6. Registered Identities */}
        <div
          onClick={onNavigateToSpeakers}
          className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">6. Identities</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">{speakerCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Enrolled biometric profiles
          </div>
        </div>

        {/* 7. Ledger Status */}
        <div
          onClick={onNavigateToAudit}
          className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer backdrop-blur-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">7. SHA-256 Ledger</span>
            <Database className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">{auditEventCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Tamper-evident blocks chained
          </div>
        </div>

        {/* 8. Model Status */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-mono uppercase">8. Models Ready</span>
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold font-mono text-purple-400">
            AASIST + ECAPA
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Voice anti-spoof + embeddings
          </div>
        </div>
      </div>

      {/* Recent Monitored Communications */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
              Protected Communication Sessions
            </h3>
            <p className="text-xs text-slate-400">
              Live and recent communication sessions protected by VoiceGuard AI
            </p>
          </div>
          <button
            onClick={() => onNavigateToLiveProtection()}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
          >
            <span>Live SOC Console</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {calls.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No Active Communication Sessions"
            description="No sessions have been initiated yet. Use the Communication Sandbox to start real-time microphone capture or forensic file analysis."
            actionText="Launch Sandbox Session"
            onAction={() => onNavigateToSandbox()}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-slate-400 bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Source Channel</th>
                  <th className="py-2.5 px-3">Claimed Identity</th>
                  <th className="py-2.5 px-3">Protected Action</th>
                  <th className="py-2.5 px-3">Sensitivity</th>
                  <th className="py-2.5 px-3">Simulated Value</th>
                  <th className="py-2.5 px-3">Defense State</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {calls.map((call) => {
                  const badge = getSourceBadge(call.source_type);
                  return (
                    <tr key={call.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-cyan-400">{call.call_id}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-semibold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {call.claimed_identity ? (
                          <span className="text-slate-200">{call.claimed_identity}</span>
                        ) : (
                          <span className="text-slate-500">Unclaimed</span>
                        )}
                      </td>
                      <td className="py-3 px-3">{call.action_type}</td>
                      <td className="py-3 px-3">
                        <RiskBadge level={call.action_sensitivity} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        {call.transaction_amount ? `₹${call.transaction_amount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            call.status === 'HOLD'
                              ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                              : call.status === 'VERIFIED'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {call.status === 'HOLD' ? 'ACTION ON HOLD' : call.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigateToLiveProtection(call.call_id)}
                          className="px-2.5 py-1 text-[11px] uppercase text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 rounded cursor-pointer transition-colors"
                        >
                          Telemetry →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enterprise Disclaimer Notice */}
      <PrototypeDisclaimer />
    </div>
  );
};
