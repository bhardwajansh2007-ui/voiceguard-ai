import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  ShieldAlert,
  ShieldCheck,
  PhoneCall,
  Lock,
  Building2,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PhoneForwarded,
  KeyRound,
  Ban,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { CallerIntelligenceDossier } from '../types';
import { EmptyState } from '../components/EmptyState';

interface CallerIntelligenceProps {
  onNavigateToLiveProtection?: (callId?: string) => void;
  onNavigateToProtectedCalls?: (callId?: string) => void;
  onNavigateToSecurityActions?: () => void;
  onNavigateToActions?: () => void;
}

export const CallerIntelligence: React.FC<CallerIntelligenceProps> = ({
  onNavigateToLiveProtection,
  onNavigateToProtectedCalls,
  onNavigateToSecurityActions,
  onNavigateToActions,
}) => {
  const [query, setQuery] = useState('EMP-DEMO-001');
  const [dossier, setDossier] = useState<CallerIntelligenceDossier | null>(null);
  const [recentDossiers, setRecentDossiers] = useState<CallerIntelligenceDossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchDossier = async (searchQuery?: string) => {
    setLoading(true);
    setFeedbackMessage(null);
    try {
      const data = await api.callerIntelligence.lookup(searchQuery || query);
      setDossier(data);
    } catch (err: any) {
      console.error('Failed to lookup caller intelligence:', err);
      setFeedbackMessage(err.message || 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const recents = await api.callerIntelligence.listRecent(5);
      setRecentDossiers(recents);
    } catch (err) {
      console.error('Failed to load recent dossiers:', err);
    }
  };

  useEffect(() => {
    fetchDossier('EMP-DEMO-001');
    fetchRecent();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchDossier(query.trim());
    }
  };

  const handleInitiateCallback = async () => {
    if (!dossier?.active_call_id) {
      setFeedbackMessage('No active call session bound to this caller. Start a session in Protected Calls to trigger real-time callback.');
      return;
    }
    setActionLoading(true);
    try {
      await api.security.initiateVerification(dossier.active_call_id, 'SUPERVISOR_CALLBACK', 'Initiating registered corporate callback verification');
      setFeedbackMessage('Registered callback verification initiated successfully.');
      fetchDossier(query);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to initiate callback.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMFA = async () => {
    if (!dossier?.active_call_id) {
      setFeedbackMessage('No active call session bound to this caller. Step-up MFA challenge requires an active session.');
      return;
    }
    setActionLoading(true);
    try {
      await api.security.initiateVerification(dossier.active_call_id, 'MFA_CHALLENGE', 'Pushing secondary MFA token challenge to registered device');
      setFeedbackMessage('Out-of-band MFA push challenge dispatched to caller device.');
      fetchDossier(query);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to dispatch MFA challenge.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldSensitiveAction = async () => {
    setActionLoading(true);
    try {
      const res = await api.security.simulateSensitiveAction({
        call_id: dossier?.active_call_id || undefined,
        action_type: dossier?.action_type || 'FINANCIAL_ACTION',
        action_description: 'High-Risk Operation Freeze via Caller Intelligence Gate',
        simulated_amount: dossier?.transaction_amount || 2500000.0,
      });
      setFeedbackMessage(res.message || 'Protected action placed on hold.');
      fetchDossier(query);
      fetchRecent();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to hold action.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'HIGH':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-950/40 border-yellow-800/60';
      case 'LOW':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
      default:
        return 'text-slate-400 bg-slate-900/60 border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-400" />
              Caller Intelligence Dossier
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              ZERO-TRUST IDENTITY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Beyond "Who is calling?": Evaluates claimed identity, biological voice authenticity, biometric enrollment, and contextual transaction risk.
          </p>
        </div>

        {/* Search / Lookup Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search phone number, EMP ID, or name..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-slate-700/70 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            <span>LOOKUP</span>
          </button>
        </form>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-lg text-xs font-mono text-cyan-300 flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Intelligence Grid */}
      {dossier ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Truecaller-Style Caller Identity Enclave */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow-lg shadow-black/40">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500" />

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono text-lg font-bold">
                  {dossier.caller_name.charAt(0)}
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${
                    dossier.identity_status === 'VERIFIED'
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                      : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                  }`}>
                    {dossier.identity_status === 'VERIFIED' ? '✓ Org Verified' : '⚠ Unverified'}
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {dossier.speaker_id}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100 font-mono m-0">
                  {dossier.caller_name}
                </h3>
                <p className="text-xs text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                  <Briefcase className="w-3 h-3" />
                  {dossier.role_title}
                </p>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" />
                  {dossier.organization} • {dossier.department}
                </p>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-1 font-semibold">
                  <PhoneCall className="w-3 h-3 text-slate-500" />
                  {dossier.caller_id}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ORGANIZATION TRUST</span>
                  <span className="text-slate-200 font-semibold">{dossier.organization_trust_status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">VOICE ENROLLMENT</span>
                  <span className={dossier.has_voice_enrollment ? 'text-emerald-400' : 'text-amber-400'}>
                    {dossier.has_voice_enrollment ? '✓ REGISTERED (128-dim)' : 'x NOT ENROLLED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">STEP-UP MFA</span>
                  <span className={dossier.mfa_enabled ? 'text-emerald-400' : 'text-slate-500'}>
                    {dossier.mfa_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">PREVIOUS SESSIONS</span>
                  <span className="text-slate-200">{dossier.previous_sessions_count} monitored calls</span>
                </div>
                {dossier.average_historical_risk !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">HISTORICAL RISK AVG</span>
                    <span className="text-slate-200">{dossier.average_historical_risk} / 100</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
                <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold mb-2">
                  SECURITY ENFORCEMENT CONTROLS
                </div>
                <button
                  onClick={handleInitiateCallback}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneForwarded className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Initiate Registered Callback</span>
                </button>
                <button
                  onClick={handleRequestMFA}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Request Out-of-Band MFA</span>
                </button>
                <button
                  onClick={handleHoldSensitiveAction}
                  disabled={actionLoading}
                  className="w-full py-2 px-3 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 text-rose-300 text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                  <span>Hold Sensitive Action</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-start gap-2">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>Compliance Disclosure:</strong> VoiceGuard is an enterprise cybersecurity layer. All demonstration identities are synthetic or used with explicit team consent.
              </span>
            </div>
          </div>

          {/* Center & Right Column: Core 3 Questions (Identity + Voice Authenticity + Safe Interaction) */}
          <div className="lg:col-span-2 space-y-5">
            {/* The 3 Fundamental Questions Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Question 1: Who is the caller? */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    QUESTION 1
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    WHO IS CALLING?
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-bold text-slate-100 font-mono">
                      {dossier.caller_name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {dossier.organization}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">IDENTITY INTEL</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {dossier.identity_status}
                  </span>
                </div>
              </div>

              {/* Question 2: Is the voice authentic? */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    QUESTION 2
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    IS VOICE AUTHENTIC?
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">SPEAKER MATCH:</span>
                      <span className="text-slate-200 font-bold">
                        {dossier.speaker_match_percentage !== null ? `${dossier.speaker_match_percentage}%` : 'Pending Audio'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-400">SYNTHETIC DETECT:</span>
                      <span className={dossier.deepfake_probability_percentage && dossier.deepfake_probability_percentage > 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {dossier.deepfake_probability_percentage !== null ? `${dossier.deepfake_probability_percentage}% Risk` : 'Model Baseline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">VOICEPRINT</span>
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                    {dossier.voice_authenticity_status}
                  </span>
                </div>
              </div>

              {/* Question 3: Is interaction safe? */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    QUESTION 3
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    IS INTERACTION SAFE?
                  </div>
                  <div className="mt-3 space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ACTION TYPE:</span>
                      <span className="text-cyan-400 font-semibold">{dossier.action_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SENSITIVITY:</span>
                      <span className="text-amber-400 font-semibold">{dossier.action_sensitivity}</span>
                    </div>
                    {dossier.transaction_amount && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">SIMULATED AMT:</span>
                        <span className="text-slate-200">₹{dossier.transaction_amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">DECISION GATE</span>
                  <span className="text-[11px] font-mono text-amber-400 font-semibold">
                    {dossier.recommended_decision}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Session Threat Gauge & Recommendation Banner */}
            <div className={`p-5 rounded-xl border ${getRiskColor(dossier.overall_risk_level)} space-y-4`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                    REAL-TIME RISK FUSION EVALUATION
                  </div>
                  <div className="text-2xl font-bold font-mono text-slate-100 mt-1 flex items-center gap-3">
                    <span>
                      {dossier.overall_risk_score !== null ? `${dossier.overall_risk_score} / 100` : 'PENDING EVALUATION'}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-black/40 border border-current font-bold uppercase">
                      {dossier.overall_risk_level} RISK
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-mono uppercase text-slate-400">RECOMMENDED SECURITY RESPONSE</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                    {dossier.recommended_decision}
                  </div>
                </div>
              </div>

              {/* Signals Progress Breakdown */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800/60 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[10px]">CALLER RISK</div>
                  <div className="font-bold text-slate-200 mt-0.5">{dossier.caller_risk_level}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">BEHAVIOR / PROSODY</div>
                  <div className="font-bold text-slate-200 mt-0.5">{dossier.behavior_risk_level}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">TRANSACTION RISK</div>
                  <div className="font-bold text-slate-200 mt-0.5">{dossier.transaction_risk_level}</div>
                </div>
              </div>

              {/* Contributing Factors */}
              {dossier.contributing_factors.length > 0 && (
                <div className="pt-3 border-t border-slate-800/60">
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    CONTRIBUTING RISK FACTORS (EXPLAINABILITY):
                  </div>
                  <ul className="space-y-1 text-xs font-mono text-slate-300">
                    {dossier.contributing_factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-cyan-400">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Navigation to Protected Calls & Live Defense */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateToLiveProtection?.(dossier.active_call_id || undefined)}
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Live Protection Spectrum</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onNavigateToProtectedCalls?.(dossier.active_call_id || undefined)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open in Protected Calls Environment</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => (onNavigateToActions ? onNavigateToActions() : onNavigateToSecurityActions?.())}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 transition cursor-pointer text-xs font-mono font-semibold"
              >
                <span>View Security Action Gate</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={UserCheck}
          title="No Caller Intelligence Found"
          description="Enter an authorized speaker ID, telephone number, or employee handle above to inspect enterprise caller intelligence."
        />
      )}

      {/* Recent Protected Sessions Section */}
      <div className="mt-8 pt-6 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold font-mono text-slate-200 uppercase m-0">
              Recent Monitored Communications
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {recentDossiers.length} SESSIONS
            </span>
          </div>
          <button
            onClick={fetchRecent}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {recentDossiers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentDossiers.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setDossier(item)}
                className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-lg cursor-pointer transition-all space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-slate-200">{item.caller_name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${getRiskColor(item.overall_risk_level)}`}>
                    {item.overall_risk_level}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                  <span>{item.organization}</span>
                  <span className="text-cyan-400">{item.caller_id}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
                  <span>ACTION: {item.action_type}</span>
                  <span className="text-amber-400">{item.recommended_decision}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-900/30 border border-slate-800/60 rounded-lg text-center text-xs font-mono text-slate-500">
            No recent communication sessions recorded.
          </div>
        )}
      </div>
    </div>
  );
};
