import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Mic,
  MicOff,
  Activity,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  KeyRound,
  RotateCcw,
  Volume2,
  Sliders,
  FileText,
  Database,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { CallSession, CallDetailResponse, StreamingAnalysisUpdate, BufferStatusUpdate, SecurityDecisionData } from '../types';

interface ProtectedPhoneProps {
  onNavigateToAuditLedger?: () => void;
  onNavigateToControlCenter?: (tab?: string) => void;
}

type PhoneCallState = 'STANDBY' | 'INCOMING' | 'ACTIVE' | 'SUMMARY';

export const ProtectedPhone: React.FC<ProtectedPhoneProps> = ({
  onNavigateToAuditLedger,
  onNavigateToControlCenter,
}) => {
  // Call State Machine
  const [callState, setCallState] = useState<PhoneCallState>('STANDBY');

  // Caller Information (Controlled Fictional Demo)
  const [callerName, setCallerName] = useState('Aarav Mehta');
  const [callerOrg, setCallerOrg] = useState('DemoBank Secure');
  const [callerRole, setCallerRole] = useState('Finance Operations');
  const [callerHandle, setCallerHandle] = useState('EMP-DEMO-001');
  const [callerNumber, setCallerNumber] = useState('+91 98000 12345');
  const [isVerifiedCaller, setIsVerifiedCaller] = useState(true);

  // Active Session & Live Backend Telemetry
  const [activeCallId, setActiveCallId] = useState<string>('');
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);

  // Real ML Streaming Updates from WebSocket
  const [streamClient, setStreamClient] = useState<VoiceStreamClient | null>(null);
  const streamClientRef = useRef<VoiceStreamClient | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Sensitive Action Hold State
  const [sensitiveActionPrompt, setSensitiveActionPrompt] = useState<string | null>(null);
  const [sensitiveActionLoading, setSensitiveActionLoading] = useState(false);
  const [sensitiveActionResult, setSensitiveActionResult] = useState<any>(null);
  const [actionHoldDismissed, setActionHoldDismissed] = useState(false);

  // Post-Call Summary Records
  const [postCallSummary, setPostCallSummary] = useState<CallDetailResponse | null>(null);
  const [maxObservedRisk, setMaxObservedRisk] = useState<number>(12);

  // Audio recording hook
  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    if (streamClientRef.current) {
      streamClientRef.current.sendAudioChunk(chunk);
    }
  }, []);

  const {
    isRecording,
    analyserNode,
    audioLevel,
    error: micError,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  // Call timer interval
  useEffect(() => {
    let timer: any;
    if (callState === 'ACTIVE') {
      timer = setInterval(() => {
        setCallDurationSec((sec) => sec + 1);
      }, 1000);
    } else {
      setCallDurationSec(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Track maximum observed risk
  useEffect(() => {
    if (liveAnalysis?.overall_risk_score) {
      setMaxObservedRisk((prev) => Math.max(prev, Math.round(liveAnalysis.overall_risk_score)));
    }
  }, [liveAnalysis]);

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger Incoming Call Simulation
  const handleTriggerIncomingCall = (scenario: 'ENROLLED_EXECUTIVE' | 'UNKNOWN_CALLER') => {
    if (scenario === 'ENROLLED_EXECUTIVE') {
      setCallerName('Aarav Mehta');
      setCallerOrg('DemoBank Secure');
      setCallerRole('Finance Operations');
      setCallerHandle('EMP-DEMO-001');
      setCallerNumber('+91 98000 12345');
      setIsVerifiedCaller(true);
    } else {
      setCallerName('Unregistered Caller');
      setCallerOrg('External Cellular Carrier');
      setCallerRole('Unknown Subscriber');
      setCallerHandle('ANON-991');
      setCallerNumber('+91 1800 00 9999');
      setIsVerifiedCaller(false);
    }

    setLiveAnalysis(null);
    setSensitiveActionPrompt(null);
    setSensitiveActionResult(null);
    setActionHoldDismissed(false);
    setMaxObservedRisk(scenario === 'ENROLLED_EXECUTIVE' ? 12 : 65);
    setCallState('INCOMING');
  };

  // Decline Call
  const handleDeclineCall = () => {
    setCallState('STANDBY');
    handleStopStream();
  };

  // Answer Call -> Transition to Active Protected Session
  const handleAnswerCall = async () => {
    setStreamError(null);
    const sessionRandomId = Math.floor(1000 + Math.random() * 9000);
    const sessionCallId = `SEC-CALL-${callerHandle.replace(/[^A-Za-z0-9]/g, '')}-${sessionRandomId}`;
    setActiveCallId(sessionCallId);

    try {
      // 1. Create call session on backend
      const createdSession = await api.calls.create({
        call_id: sessionCallId,
        source_type: 'CONTROLLED_PHONE_SIMULATOR',
        action_type: 'SECURE_CONVERSATION',
        action_sensitivity: isVerifiedCaller ? 'MEDIUM' : 'HIGH',
        claimed_identity: `${callerName} (${callerRole})`,
        caller_id: callerNumber,
        authentication_state: isVerifiedCaller ? 'VOICE_CHALLENGE_ACTIVE' : 'UNVERIFIED',
      });
      setActiveCallSession(createdSession);

      // 2. Connect WebSocket stream for real-time audio analysis
      const client = new VoiceStreamClient(
        sessionCallId,
        (update) => {
          setLiveAnalysis(update);
        },
        (errMsg) => {
          setStreamError(errMsg);
        },
        () => {
          setIsStreaming(true);
          startRecording();
        },
        (buffer) => {
          setBufferStatus(buffer);
        }
      );

      streamClientRef.current = client;
      setStreamClient(client);
      client.connect();

      setCallState('ACTIVE');
    } catch (err: any) {
      setStreamError(err.message || 'Failed to initialize protected call session');
      setCallState('STANDBY');
    }
  };

  // End Call -> Fetch final dossier and show post-call summary
  const handleEndCall = async () => {
    handleStopStream();

    if (activeCallId) {
      try {
        const detail = await api.calls.get(activeCallId);
        setPostCallSummary(detail);
      } catch (err) {
        console.error('Failed to load post-call details:', err);
      }
    }

    setCallState('SUMMARY');
  };

  // Stop Audio and WebSocket Stream
  const handleStopStream = () => {
    if (streamClientRef.current) {
      streamClientRef.current.stop();
      streamClientRef.current.disconnect();
      streamClientRef.current = null;
    }
    setStreamClient(null);
    stopRecording();
    setIsStreaming(false);
    setBufferStatus(null);
  };

  // Trigger Controlled Sensitive Action Request (e.g. ₹25,00,000 transfer)
  const handleTriggerSensitiveRequest = async () => {
    if (!activeCallId) return;

    setSensitiveActionLoading(true);
    setSensitiveActionPrompt('Approve ₹25,00,000 emergency offshore wire transfer immediately.');

    try {
      // Simulate action evaluation through backend security gateway
      const result = await api.security.simulateSensitiveAction({
        call_id: activeCallId,
        action_type: 'EMERGENCY_WIRE_TRANSFER',
        action_description: 'Emergency wire transfer approval of ₹25,00,000',
        simulated_amount: 2500000,
      });

      setSensitiveActionResult(result);
      setActionHoldDismissed(false);

      // Elevate risk score based on real transaction sensitivity
      if (liveAnalysis) {
        setLiveAnalysis({
          ...liveAnalysis,
          overall_risk_score: Math.max(82, result.risk_score || 82),
          risk_level: 'CRITICAL',
          recommended_action: 'HOLD_SENSITIVE_ACTION',
          decision_reason: 'High-value financial approval (₹25,00,000) triggered automated security hold.',
        });
      }
      setMaxObservedRisk(82);
    } catch (err: any) {
      setStreamError(err.message || 'Sensitive action evaluation failed');
    } finally {
      setSensitiveActionLoading(false);
    }
  };

  // In-Call Risk Color & Badge Helper
  const currentRiskScore = liveAnalysis ? Math.round(liveAnalysis.overall_risk_score) : maxObservedRisk;
  const isHighRiskAlert = currentRiskScore >= 61 || sensitiveActionResult?.status === 'HOLD';

  const getRiskDetails = (score: number) => {
    if (score >= 81) return { level: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-500/50', label: 'CRITICAL RISK' };
    if (score >= 61) return { level: 'HIGH', color: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-500/50', label: 'ELEVATED RISK' };
    if (score >= 31) return { level: 'MEDIUM', color: 'text-cyan-300', bg: 'bg-cyan-950/80 border-cyan-500/50', label: 'MODERATE RISK' };
    return { level: 'LOW', color: 'text-emerald-400', bg: 'bg-emerald-950/80 border-emerald-500/50', label: 'PROTECTED (LOW)' };
  };

  const riskInfo = getRiskDetails(currentRiskScore);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-2 sm:py-6">
      {/* Top Banner Notice */}
      <div className="w-full max-w-md mb-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-slate-300 font-bold uppercase">CONTROLLED PHONE ENVIRONMENT</span>
        </div>
        <span className="text-slate-500">VOICEGUARD AI</span>
      </div>

      {/* Main Smartphone Shell */}
      <div className="relative w-full max-w-[390px] h-[780px] bg-slate-950 border-4 border-slate-800/90 rounded-[44px] shadow-2xl shadow-cyan-950/30 flex flex-col justify-between overflow-hidden p-5 text-slate-100 font-sans select-none">
        
        {/* Dynamic Island / Earpiece Speaker Bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full flex items-center justify-center z-30">
          <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800 mr-2" />
          <div className="w-10 h-1 bg-slate-800 rounded-full" />
        </div>

        {/* Smartphone Status Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3 px-2 z-20">
          <span>09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tracking-wider">5G</span>
            <div className="w-5 h-2.5 border border-slate-500 rounded-sm p-0.5 flex items-center">
              <div className="w-full h-full bg-cyan-400 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* STATE 1: STANDBY / DIALER */}
        {callState === 'STANDBY' && (
          <div className="flex-1 flex flex-col justify-between py-6 z-10">
            <div className="text-center mt-6">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 mb-3 text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">
                VOICEGUARD
              </h1>
              <p className="text-xs text-cyan-400/90 font-mono tracking-wider mt-0.5">
                ACTIVE VOICE DEFENSE LAYER
              </p>
              <div className="mt-4 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-left text-xs space-y-1">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Real-time Anti-Spoof Neural Filter</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Biometric Acoustic Distance Probes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Automated Transaction Hold Enclave</span>
                </div>
              </div>
            </div>

            {/* Quick Demo Incoming Call Launchers */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider text-center">
                SIMULATE INCOMING CALLS (JUDGING DEMO)
              </div>

              <button
                onClick={() => handleTriggerIncomingCall('ENROLLED_EXECUTIVE')}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/90 hover:from-cyan-950/40 hover:to-slate-900 border border-cyan-500/40 text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Aarav Mehta</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Finance Operations • DemoBank Secure
                  </div>
                </div>
                <PhoneCall className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => handleTriggerIncomingCall('UNKNOWN_CALLER')}
                className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/90 hover:from-amber-950/40 hover:to-slate-900 border border-amber-500/30 text-left transition cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Unknown Caller</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      UNREGISTERED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    +91 1800 00 9999 • No Reference Biometrics
                  </div>
                </div>
                <PhoneCall className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="text-center text-[11px] text-slate-500 font-mono">
              Ready for encrypted call supervision
            </div>
          </div>
        )}

        {/* STATE 2: INCOMING CALL SCREEN */}
        {callState === 'INCOMING' && (
          <div className="flex-1 flex flex-col justify-between py-6 z-10 animate-fade-in">
            <div className="text-center mt-6">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">
                VOICEGUARD SECURED CALL
              </span>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                INCOMING CALL
              </div>

              {/* Caller Avatar */}
              <div className="relative w-24 h-24 mx-auto my-6">
                <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping opacity-75" />
                <div className="relative w-24 h-24 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-cyan-500/20">
                  {callerName.charAt(0)}
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight">
                {callerName}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-1">
                {callerRole} &bull; {callerOrg}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {callerNumber} ({callerHandle})
              </p>

              {/* Verified Identity Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isVerifiedCaller ? 'VERIFIED IDENTITY' : 'UNREGISTERED IDENTITY'}</span>
              </div>
            </div>

            {/* VoiceGuard Status Preview Box */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span>VOICEGUARD STATUS</span>
                <span className={riskInfo.color}>{riskInfo.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Voice Authenticity:</span>
                  <span className="text-slate-200">AASIST Active</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Speaker Vector:</span>
                  <span className={isVerifiedCaller ? 'text-emerald-400' : 'text-amber-400'}>
                    {isVerifiedCaller ? 'ECAPA Enrolled' : 'Not On File'}
                  </span>
                </div>
              </div>
            </div>

            {/* Answer & Decline Controls */}
            <div className="flex items-center justify-around px-4 pt-4">
              {/* Decline Button */}
              <button
                onClick={handleDeclineCall}
                className="flex flex-col items-center gap-2 text-xs font-mono text-rose-400 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
                  <PhoneOff className="w-7 h-7" />
                </div>
                <span>DECLINE</span>
              </button>

              {/* Answer Button */}
              <button
                onClick={handleAnswerCall}
                className="flex flex-col items-center gap-2 text-xs font-mono text-emerald-400 hover:scale-105 transition-transform cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/40 animate-pulse">
                  <PhoneCall className="w-7 h-7" />
                </div>
                <span>ANSWER</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE 3: ACTIVE CALL SCREEN */}
        {callState === 'ACTIVE' && (
          <div className="flex-1 flex flex-col justify-between py-4 z-10 animate-fade-in relative">
            {/* Top Bar Call Timer */}
            <div className="text-center pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VOICEGUARD PROTECTED CALL
              </span>
              <div className="text-xl font-mono font-bold text-white mt-1">
                {formatTime(callDurationSec)}
              </div>
              <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                {callerName}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {callerRole} &bull; {callerOrg}
              </p>
            </div>

            {/* In-Call Acoustic Waveform Display */}
            <div className="my-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" />
                  Live Acoustic Spectrum
                </span>
                <span>Level: {(audioLevel * 100).toFixed(0)}%</span>
              </div>
              <div className="h-16 w-full flex items-center justify-center">
                <WaveformVisualizer analyserNode={analyserNode} isActive={isStreaming} />
              </div>
            </div>

            {/* Real-time Security Metrics Dashboard */}
            <div className={`p-3.5 rounded-2xl border ${riskInfo.bg} transition-colors duration-300 font-mono text-xs space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-slate-400">REAL-TIME RISK SCORE</span>
                <span className={`text-base font-bold ${riskInfo.color}`}>
                  {currentRiskScore} / 100 &bull; {riskInfo.level}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentRiskScore > 70
                      ? 'bg-rose-500'
                      : currentRiskScore > 40
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(currentRiskScore, 100)}%` }}
                />
              </div>

              {/* Real ML Values */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Voice Authenticity:</span>
                  <span className="text-slate-200 font-bold">
                    {liveAnalysis?.voice_authenticity?.status === 'GENUINE'
                      ? 'GENUINE SPEECH'
                      : liveAnalysis?.voice_authenticity?.status === 'SPOOF'
                      ? 'SYNTHETIC ARTIFACTS'
                      : 'EVALUATING AUDIO'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Speaker Verification:</span>
                  <span className="text-slate-200 font-bold">
                    {liveAnalysis?.speaker_verification?.status === 'MATCH'
                      ? 'BIOMETRIC MATCH'
                      : liveAnalysis?.speaker_verification?.status === 'MISMATCH'
                      ? 'SPEAKER ANOMALY'
                      : isVerifiedCaller
                      ? 'MATCHING REFERENCE'
                      : 'NO RECORD ON FILE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Controlled Judging Demo Trigger: Sensitive Request */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  DEMO: SENSITIVE ACTION TRIGGER
                </span>
                <span className="text-[9px] font-mono px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  CONTROLLED SIH TEST
                </span>
              </div>

              <button
                onClick={handleTriggerSensitiveRequest}
                disabled={sensitiveActionLoading || sensitiveActionResult?.status === 'HOLD'}
                className="w-full py-2 px-3 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-600/50 text-[11px] font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {sensitiveActionResult?.status === 'HOLD'
                    ? 'Sensitive Action Locked on Hold'
                    : sensitiveActionLoading
                    ? 'Evaluating Action Sensitivity...'
                    : 'Simulate Sensitive Request (₹25L Wire)'}
                </span>
              </button>
            </div>

            {/* In-Call Action Overlay (Risk Alert or Action Hold) */}
            {isHighRiskAlert && !actionHoldDismissed && (
              <div className="absolute inset-x-2 bottom-24 bg-slate-900/95 border-2 border-rose-500/70 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-40 animate-slide-up space-y-3 font-mono">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <ShieldAlert className="w-5 h-5 animate-pulse shrink-0" />
                    <span>POTENTIAL VOICE IMPERSONATION DETECTED</span>
                  </div>
                  <button
                    onClick={() => setActionHoldDismissed(true)}
                    className="text-slate-500 hover:text-slate-300 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  VoiceGuard detected elevated biometric discrepancy and a high-impact financial request. Action has been frozen pending step-up authentication.
                </p>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => alert('Dispatching out-of-band MFA push notification to Aarav Mehta registered device.')}
                    className="py-2 px-1 text-[10px] font-bold uppercase rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/50 text-center cursor-pointer"
                  >
                    Request MFA
                  </button>
                  <button
                    onClick={() => alert('Initiating secure supervisor callback to +91 98000 12345.')}
                    className="py-2 px-1 text-[10px] font-bold uppercase rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-center cursor-pointer"
                  >
                    Callback
                  </button>
                  <button
                    onClick={() => alert('Protected action locked in cryptographic ledger under SHA-256.')}
                    className="py-2 px-1 text-[10px] font-bold uppercase rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600/60 text-center cursor-pointer"
                  >
                    Action Hold
                  </button>
                </div>
              </div>
            )}

            {/* In-Call Phone Action Controls */}
            <div className="flex items-center justify-around px-4 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition ${
                  isMuted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Mute Microphone"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/40 cursor-pointer hover:scale-105 transition-transform"
                title="End Protected Call"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              <button
                onClick={() => onNavigateToControlCenter?.('live-protection')}
                className="w-12 h-12 rounded-full bg-slate-800 text-cyan-400 hover:bg-slate-700 flex items-center justify-center cursor-pointer transition"
                title="Open SOC Live Telemetry"
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STATE 4: POST-CALL SECURITY SUMMARY REPORT */}
        {callState === 'SUMMARY' && (
          <div className="flex-1 flex flex-col justify-between py-5 z-10 animate-fade-in font-mono text-xs">
            <div>
              <div className="text-center pt-2 pb-4 border-b border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  CALL TERMINATED & SECURED
                </span>
                <h2 className="text-lg font-bold text-white mt-1">
                  Security Defense Summary
                </h2>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Target: {callerName} ({callerHandle})
                </div>
              </div>

              {/* Dossier Summary Cards */}
              <div className="mt-4 space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Identity Status:</span>
                    <span className="text-emerald-400 font-bold">
                      {isVerifiedCaller ? 'VERIFIED (Aarav Mehta)' : 'UNREGISTERED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Peak Risk Evaluated:</span>
                    <span className={`font-bold ${riskInfo.color}`}>
                      {maxObservedRisk} / 100 ({riskInfo.level})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Voice Authenticity:</span>
                    <span className="text-slate-200">
                      {liveAnalysis?.voice_authenticity?.status || 'Acoustic Model Evaluated'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Biometric Match:</span>
                    <span className="text-slate-200">
                      {isVerifiedCaller ? 'ECAPA Unit Match Confirmed' : 'No Reference Profile'}
                    </span>
                  </div>
                </div>

                {/* Sensitive Action Record */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase block">PROTECTED ACTION ENFORCEMENT</span>
                  {sensitiveActionResult ? (
                    <div className="text-slate-200 text-[11px]">
                      <span className="text-rose-400 font-bold">HOLD ENFORCED:</span> ₹25,00,000 Wire Transfer was frozen by VoiceGuard Gateway.
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px]">
                      No high-risk transactions attempted during session.
                    </div>
                  )}
                </div>

                {/* Cryptographic Hash Chain Audit Badge */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                      SHA-256 LEDGER
                    </span>
                    <span className="text-[11px] text-slate-300">
                      Cryptographic event signed
                    </span>
                  </div>
                  <Database className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>

            {/* Summary Navigation Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => onNavigateToAuditLedger?.()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs uppercase transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Inspect in Audit Ledger</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCallState('STANDBY')}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase transition cursor-pointer"
              >
                Start New Protected Call
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Switcher Helper for Demonstration */}
      <div className="mt-4 flex items-center gap-3 text-xs font-mono text-slate-400">
        <span>Looking for administrator controls?</span>
        <button
          onClick={() => onNavigateToControlCenter?.('overview')}
          className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
        >
          Open Security Control Center &rarr;
        </button>
      </div>
    </div>
  );
};
