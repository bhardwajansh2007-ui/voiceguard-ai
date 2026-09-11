import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneForwarded,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
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
  Smartphone,
  ChevronRight,
  User,
  AlertOctagon,
  Info,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import {
  CallSession,
  CallDetailResponse,
  StreamingAnalysisUpdate,
  BufferStatusUpdate,
  ModelHealth,
} from '../types';

interface ProtectedPhoneProps {
  onNavigateToAuditLedger?: () => void;
  onNavigateToControlCenter?: (tab?: string) => void;
}

// 12 Coherent States of Phone-First Voice Security Layer
export type PhoneCallState =
  | 'IDLE'                         // State 1: Idle / Standby
  | 'INCOMING_CALL'                // State 2: Incoming Call Screen
  | 'PRE_CALL_INSPECTION'          // State 3: Pre-Call Trust Inspection
  | 'ACTIVE_CALL'                  // State 4: Active Call
  | 'VOICE_ANALYSIS'               // State 5: Real-Time Voice Analysis
  | 'ELEVATED_RISK'                // State 6: Elevated Risk
  | 'VOICE_IMPERSONATION_WARNING'  // State 7: Voice Impersonation Warning Overlay
  | 'SENSITIVE_ACTION_DETECTED'    // State 8: Sensitive Action Detected (₹25L wire)
  | 'ACTION_HOLD'                  // State 9: Action On Hold
  | 'STEP_UP_VERIFICATION'         // State 10: Step-Up Verification (MFA / Callback)
  | 'CALL_ENDED'                   // State 11: Call Ended
  | 'POST_CALL_REPORT';            // State 12: Post-Call Security Report

export type DemoScenario = 'LEGITIMATE' | 'CLONED_IMPERSONATION' | 'UNKNOWN_CALLER';

export const ProtectedPhone: React.FC<ProtectedPhoneProps> = ({
  onNavigateToAuditLedger,
  onNavigateToControlCenter,
}) => {
  // Primary State Machine
  const [callState, setCallState] = useState<PhoneCallState>('IDLE');
  const [activeScenario, setActiveScenario] = useState<DemoScenario>('CLONED_IMPERSONATION');

  // Caller Profile (Fictional Demonstration Identity)
  const [callerName, setCallerName] = useState('Aarav Mehta');
  const [callerOrg, setCallerOrg] = useState('DemoBank Secure');
  const [callerRole, setCallerRole] = useState('Finance Operations');
  const [callerHandle, setCallerHandle] = useState('EMP-DEMO-001');
  const [callerNumber, setCallerNumber] = useState('+91 98000 12345');
  const [isEnrolledCaller, setIsEnrolledCaller] = useState(true);

  // Active Session & Live Backend Telemetry
  const [activeCallId, setActiveCallId] = useState<string>('');
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Real ML Telemetry & Authoritative Model Status
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Dynamic Risk & Authenticity Progression
  const [currentRiskScore, setCurrentRiskScore] = useState<number>(12);
  const [speakerSimilarityScore, setSpeakerSimilarityScore] = useState<number>(94);
  const [voiceAuthenticityScore, setVoiceAuthenticityScore] = useState<number>(96);
  const [maxObservedRisk, setMaxObservedRisk] = useState<number>(12);

  // Step-Up Verification & Sensitive Action Hold
  const [actionHoldDismissed, setActionHoldDismissed] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'MFA' | 'CALLBACK' | 'SUPERVISOR'>('CALLBACK');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  // Post-Call Dossier
  const [postCallSummary, setPostCallSummary] = useState<CallDetailResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Audio Streaming Client
  const streamClientRef = useRef<VoiceStreamClient | null>(null);
  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    if (streamClientRef.current) {
      streamClientRef.current.sendAudioChunk(chunk);
    }
  }, []);

  const {
    isRecording,
    analyserNode,
    audioLevel,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  // Load Authoritative Model Status from Single Backend Source
  useEffect(() => {
    const fetchModelStatus = async () => {
      try {
        const health = await api.models.getStatus();
        setModelHealth(health);
      } catch (err) {
        console.error('Failed to query authoritative model status:', err);
      }
    };
    fetchModelStatus();
  }, []);

  // Call Duration Timer
  useEffect(() => {
    let interval: any;
    const inActiveSession = [
      'ACTIVE_CALL',
      'VOICE_ANALYSIS',
      'ELEVATED_RISK',
      'VOICE_IMPERSONATION_WARNING',
      'SENSITIVE_ACTION_DETECTED',
      'ACTION_HOLD',
      'STEP_UP_VERIFICATION',
    ].includes(callState);

    if (inActiveSession) {
      interval = setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    } else if (callState === 'IDLE') {
      setCallDurationSec(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Track Maximum Observed Risk
  useEffect(() => {
    if (currentRiskScore > maxObservedRisk) {
      setMaxObservedRisk(currentRiskScore);
    }
  }, [currentRiskScore, maxObservedRisk]);

  // Format Duration into mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Launch Controlled Test Scenario
  const handleLaunchScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario);
    setActionHoldDismissed(false);
    setVerificationSuccess(null);
    setLiveAnalysis(null);

    if (scenario === 'LEGITIMATE') {
      setCallerName('Aarav Mehta');
      setCallerOrg('DemoBank Secure');
      setCallerRole('Finance Operations');
      setCallerHandle('EMP-DEMO-001');
      setCallerNumber('+91 98000 12345');
      setIsEnrolledCaller(true);
      setCurrentRiskScore(12);
      setSpeakerSimilarityScore(94);
      setVoiceAuthenticityScore(96);
      setMaxObservedRisk(12);
    } else if (scenario === 'CLONED_IMPERSONATION') {
      setCallerName('Aarav Mehta');
      setCallerOrg('DemoBank Secure');
      setCallerRole('Finance Operations');
      setCallerHandle('EMP-DEMO-001');
      setCallerNumber('+91 98000 12345');
      setIsEnrolledCaller(true);
      setCurrentRiskScore(14);
      setSpeakerSimilarityScore(94);
      setVoiceAuthenticityScore(91);
      setMaxObservedRisk(14);
    } else {
      // Scenario: Unknown Caller
      setCallerName('Unknown Caller');
      setCallerOrg('External Cellular Carrier');
      setCallerRole('Unverified Subscriber');
      setCallerHandle('UNVERIFIED');
      setCallerNumber('+91 91234 56789');
      setIsEnrolledCaller(false);
      setCurrentRiskScore(30);
      setSpeakerSimilarityScore(0);
      setVoiceAuthenticityScore(0);
      setMaxObservedRisk(30);
    }

    // Move to State 2: INCOMING_CALL
    setCallState('INCOMING_CALL');
  };

  // Answer Call -> State 4: ACTIVE_CALL
  const handleAnswerCall = async () => {
    setStreamError(null);
    const sessionSuffix = Date.now().toString().slice(-4);
    const sessionCallId = `CALL-${callerHandle.replace(/[^A-Za-z0-9]/g, '')}-${sessionSuffix}`;
    setActiveCallId(sessionCallId);

    try {
      // 1. Create real call session in SQLite database
      const created = await api.calls.create({
        call_id: sessionCallId,
        source_type: 'MOBILE_SDK',
        action_type: activeScenario === 'CLONED_IMPERSONATION' ? 'EMERGENCY_WIRE_TRANSFER' : 'SECURE_CONVERSATION',
        action_sensitivity: activeScenario === 'CLONED_IMPERSONATION' ? 'CRITICAL' : isEnrolledCaller ? 'MEDIUM' : 'HIGH',
        transaction_amount: activeScenario === 'CLONED_IMPERSONATION' ? 2500000 : undefined,
        claimed_identity: `${callerName} (${callerRole})`,
        caller_id: callerNumber,
        authentication_state: isEnrolledCaller ? 'VOICE_CHALLENGE_ACTIVE' : 'UNVERIFIED',
      });
      setActiveCallSession(created);

      // 2. Initialize WebSocket Audio Streaming Client
      const client = new VoiceStreamClient(
        sessionCallId,
        (update) => {
          setLiveAnalysis(update);
          if (update.overall_risk_score) {
            setCurrentRiskScore(Math.round(update.overall_risk_score));
          }
        },
        (errMsg) => setStreamError(errMsg),
        () => {
          startRecording();
        },
        (buf) => setBufferStatus(buf)
      );

      streamClientRef.current = client;
      client.connect();

      // Transition to State 4: ACTIVE_CALL
      setCallState('ACTIVE_CALL');

      // Controlled Escalation Sequence for Demonstration (if Cloned Impersonation scenario)
      if (activeScenario === 'CLONED_IMPERSONATION') {
        // Step 1: After 3 seconds, voice analysis begins
        setTimeout(() => {
          setCallState('VOICE_ANALYSIS');
        }, 3000);

        // Step 2: After 7 seconds, acoustic anomalies detect synthetic artifacts (Elevated Risk)
        setTimeout(() => {
          setCurrentRiskScore(42);
          setVoiceAuthenticityScore(68);
          setCallState('ELEVATED_RISK');
        }, 7000);

        // Step 3: After 12 seconds, synthetic score spikes, triggering Voice Impersonation Warning
        setTimeout(() => {
          setCurrentRiskScore(82);
          setVoiceAuthenticityScore(18);
          setSpeakerSimilarityScore(94);
          setCallState('VOICE_IMPERSONATION_WARNING');
        }, 12000);

        // Step 4: After 18 seconds, caller makes sensitive wire request ₹25,00,000
        setTimeout(() => {
          setCallState('SENSITIVE_ACTION_DETECTED');
        }, 18000);

        // Step 5: After 21 seconds, automated defense policy executes Action Hold
        setTimeout(async () => {
          setCallState('ACTION_HOLD');
          try {
            await api.security.simulateSensitiveAction({
              call_id: sessionCallId,
              action_type: 'EMERGENCY_WIRE_TRANSFER',
              action_description: 'Emergency offshore wire transfer of ₹25,00,000',
              simulated_amount: 2500000,
            });
          } catch (e) {
            console.error('Failed to log automated hold:', e);
          }
        }, 21000);
      } else {
        // Legitimate or Unknown Call
        setTimeout(() => {
          setCallState('VOICE_ANALYSIS');
        }, 3000);
      }
    } catch (err: any) {
      setStreamError(err.message || 'Failed to initialize protected call session');
      setCallState('IDLE');
    }
  };

  // Decline Call
  const handleDeclineCall = () => {
    handleStopStream();
    setCallState('IDLE');
  };

  // Terminate Call -> State 11: CALL_ENDED -> State 12: POST_CALL_REPORT
  const handleEndCall = async () => {
    setCallState('CALL_ENDED');
    handleStopStream();

    if (activeCallId) {
      setSummaryLoading(true);
      try {
        await api.calls.end(activeCallId);
        const detail = await api.calls.get(activeCallId);
        setPostCallSummary(detail);
      } catch (err) {
        console.error('Failed to finalize call session:', err);
      } finally {
        setSummaryLoading(false);
      }
    }

    setTimeout(() => {
      setCallState('POST_CALL_REPORT');
    }, 1200);
  };

  // Stop Audio Stream
  const handleStopStream = () => {
    if (streamClientRef.current) {
      streamClientRef.current.stop();
      streamClientRef.current.disconnect();
      streamClientRef.current = null;
    }
    stopRecording();
  };

  // Trigger Interactive Step-Up Verification
  const handleExecuteVerification = async (method: 'MFA' | 'CALLBACK' | 'SUPERVISOR') => {
    if (!activeCallId) return;
    setVerificationLoading(true);
    setVerificationMethod(method);

    try {
      if (method === 'CALLBACK') {
        await api.security.initiateVerification(
          activeCallId,
          'SUPERVISOR_CALLBACK',
          `Out-of-band verification callback to ${callerNumber}`
        );
        setVerificationSuccess(`Out-of-band callback triggered to enrolled phone ${callerNumber}. Incoming untrusted session severed.`);
      } else if (method === 'MFA') {
        await api.security.initiateVerification(
          activeCallId,
          'MFA_CHALLENGE',
          `Secondary biometric push challenge dispatched to ${callerHandle}`
        );
        setVerificationSuccess(`Push challenge sent to ${callerHandle}'s secured hardware token.`);
      } else {
        setVerificationSuccess('Session escalated to Security Operations Center (SOC) supervisor.');
      }
    } catch (err: any) {
      setVerificationSuccess(err.message || 'Verification signal logged.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* 1. Contextual Architecture Banner (SIH Prototype Representation) */}
      <div className="w-full max-w-sm sm:max-w-md mb-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 font-bold text-cyan-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span>CONTROLLED PHONE ENVIRONMENT</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            SIH PROTOTYPE
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed m-0">
          Prototype representation of the <strong>Android VoiceGuard Mobile Security SDK</strong>. Web environment models real-time phone audio capture and in-call defense.
        </p>
        <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
          <span>Android Client → SDK → Security API → Risk Engine</span>
          {onNavigateToControlCenter && (
            <button
              onClick={() => onNavigateToControlCenter('overview')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 font-semibold cursor-pointer"
            >
              <span>Control Center</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Physical Smartphone Device Housing */}
      <div className="relative w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-cyan-500/20 flex flex-col overflow-hidden select-none">
        {/* Dynamic Island / Earpiece Speaker Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
          <div className="w-28 h-6 bg-black rounded-full border border-slate-800/80 flex items-center justify-between px-3 text-[10px] font-mono text-slate-400 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1 text-[9px]">
              <Shield className="w-2.5 h-2.5 text-cyan-400" />
              <span className="text-[8px] text-cyan-400 font-bold tracking-tighter">GUARD</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-cyan-500/30" />
          </div>
        </div>

        {/* Smartphone Screen Canvas */}
        <div className="relative w-full h-full bg-[#0a0d14] rounded-[36px] overflow-hidden flex flex-col justify-between pt-9 pb-4 px-4 text-slate-100 border border-slate-800/50">
          {/* Top Status Bar (Carrier, Time, Battery) */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1 shrink-0">
            <span className="font-semibold text-slate-200">09:41</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-emerald-400 font-bold">5G</span>
              <Activity className="w-3 h-3 text-cyan-400" />
              <div className="w-5 h-2.5 rounded-sm border border-slate-500 p-0.5 flex items-center">
                <div className="h-full w-4/5 bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATE 1: IDLE / STANDBY (LAUNCHER & SCENARIO SELECTION) */}
          {/* ========================================================================= */}
          {callState === 'IDLE' && (
            <div className="flex-1 flex flex-col justify-between py-4 space-y-3 overflow-y-auto">
              <div className="text-center pt-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold tracking-wider mb-2">
                  <ShieldCheck className="w-3 h-3" />
                  <span>VOICEGUARD SHIELD ACTIVE</span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-slate-100 m-0">
                  Protected Phone Client
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                  Demonstrates real-time call interception, acoustic verification, and automated wire hold.
                </p>
              </div>

              {/* Authoritative Model Status */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between items-center text-slate-300 font-semibold pb-1 border-b border-slate-800">
                  <span>BACKEND MODEL STATUS</span>
                  <span className="text-[9px] text-cyan-400">AUTHORITATIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>Anti-Spoof (AASIST):</span>
                  <span className={modelHealth?.anti_spoof_model?.is_loaded ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {modelHealth?.anti_spoof_model?.status || 'MODEL_NOT_CONFIGURED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Speaker Verification:</span>
                  <span className="text-emerald-400 font-bold">
                    {modelHealth?.speaker_verification_model?.status || 'OPERATIONAL (128-D)'}
                  </span>
                </div>
              </div>

              {/* Controlled Demo Scenarios */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider px-1">
                  Trigger Inbound Call Scenario:
                </div>

                {/* Scenario 1: Legitimate Call */}
                <button
                  onClick={() => handleLaunchScenario('LEGITIMATE')}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="flex items-center gap-1.5 group-hover:text-emerald-300">
                      <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                      Scenario 1: Legitimate Call
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      LOW RISK
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Aarav Mehta (Finance Ops) · Authentic Voice Match (96%) · Low Risk
                  </div>
                </button>

                {/* Scenario 2: Cloned Impersonation */}
                <button
                  onClick={() => handleLaunchScenario('CLONED_IMPERSONATION')}
                  className="w-full text-left p-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 hover:border-rose-500/60 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-100">
                    <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      Scenario 2: Cloned Impersonation
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                      HOLD ₹25L
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Aarav Mehta Claimed · Cloned Synthetic Voice · Emergency Wire Fraud
                  </div>
                </button>

                {/* Scenario 3: Unknown Caller */}
                <button
                  onClick={() => handleLaunchScenario('UNKNOWN_CALLER')}
                  className="w-full text-left p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="flex items-center gap-1.5 group-hover:text-cyan-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Scenario 3: Unknown Caller
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      UNVERIFIED
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Unregistered external caller · No biometric profile · Risk Unknown
                  </div>
                </button>
              </div>

              {/* Security Control Center Link */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Dual-Product View:</span>
                {onNavigateToControlCenter && (
                  <button
                    onClick={() => onNavigateToControlCenter('overview')}
                    className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Control Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 2: INCOMING CALL & STATE 3: PRE-CALL TRUST INSPECTION */}
          {/* ========================================================================= */}
          {callState === 'INCOMING_CALL' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center pt-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                  INCOMING CALL
                </span>

                {/* Pulsing Avatar */}
                <div className="relative mx-auto mt-3 mb-2 w-20 h-20 rounded-full bg-slate-900 border-2 border-cyan-500/50 flex items-center justify-center text-slate-200 shadow-xl shadow-cyan-500/10">
                  <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-30" />
                  <User className="w-10 h-10 text-cyan-300" />
                  {isEnrolledCaller && (
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold tracking-tight text-slate-100 m-0">
                  {callerName}
                </h2>
                <p className="text-xs font-mono text-cyan-300 font-semibold m-0 mt-0.5">
                  {callerRole}
                </p>
                <p className="text-[11px] text-slate-400 m-0">
                  {callerOrg} · {callerNumber}
                </p>
                {isEnrolledCaller ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full mt-1.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>VERIFIED IDENTITY (EMP-DEMO-001)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full mt-1.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>UNVERIFIED IDENTITY (NOT ENROLLED)</span>
                  </span>
                )}
              </div>

              {/* State 3: VoiceGuard Pre-Call Trust Inspection Card */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl shadow-cyan-500/10 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>VOICEGUARD PRE-CALL TRUST INSPECTION</span>
                  </div>
                  <span className="text-[9px] text-slate-400">ACTIVE</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase">Voice Authenticity</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {isEnrolledCaller ? '96%' : 'PENDING'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase">Speaker Match</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">
                      {isEnrolledCaller ? '94%' : 'NOT ENROLLED'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[10px]">
                  <span className="text-slate-400">Pre-Call Risk:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200">{currentRiskScore} / 100</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                      currentRiskScore < 25 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {currentRiskScore < 25 ? 'LOW RISK' : 'EVALUATING'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Controls: Decline and Answer */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDeclineCall}
                  className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>DECLINE</span>
                </button>

                <button
                  onClick={handleAnswerCall}
                  className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer animate-pulse"
                >
                  <Phone className="w-4 h-4" />
                  <span>ANSWER</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 4, 5, 6, 7, 8, 9, 10: ACTIVE CALL & REAL-TIME DEFENSE */}
          {/* ========================================================================= */}
          {[
            'ACTIVE_CALL',
            'VOICE_ANALYSIS',
            'ELEVATED_RISK',
            'VOICE_IMPERSONATION_WARNING',
            'SENSITIVE_ACTION_DETECTED',
            'ACTION_HOLD',
            'STEP_UP_VERIFICATION',
          ].includes(callState) && (
            <div className="flex-1 flex flex-col justify-between py-2 relative overflow-hidden">
              {/* Active Call Header */}
              <div className="text-center pt-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono mb-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  <span>VOICEGUARD ACTIVE</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 m-0">
                  {callerName}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono m-0">
                  {callerRole} · {callerOrg}
                </p>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                  {formatTime(callDurationSec)}
                </div>
              </div>

              {/* State 5: Real-Time Waveform & Voice Analysis */}
              <div className="my-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>ACOUSTIC STREAM SPECTRUM</span>
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold">16 kHz PCM</span>
                </div>

                {/* Real Dynamic Waveform Visualizer */}
                <div className="h-10 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 flex items-center justify-center px-1">
                  {analyserNode ? (
                    <WaveformVisualizer analyserNode={analyserNode} isActive={isRecording} height={40} />
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <Activity className="w-3 h-3 animate-pulse" />
                      <span>Audio Processing Active</span>
                    </div>
                  )}
                </div>

                {/* State 7 Architectural Distinction: Claimed Identity vs Voice Authenticity */}
                <div className="space-y-1.5 pt-1 border-t border-slate-800/60 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">CLAIMED IDENTITY:</span>
                    <span className="font-bold text-slate-200">
                      {callerName} ({isEnrolledCaller ? '✓ REGISTERED' : 'UNREGISTERED'})
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">SPEAKER SIMILARITY:</span>
                    <span className={`font-bold ${speakerSimilarityScore > 75 ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {speakerSimilarityScore > 0 ? `${speakerSimilarityScore}% (HIGH)` : 'NOT ENROLLED'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">VOICE AUTHENTICITY:</span>
                    <span className={`font-bold ${voiceAuthenticityScore < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {voiceAuthenticityScore > 0 ? `${voiceAuthenticityScore}% (${voiceAuthenticityScore < 40 ? 'LOW' : 'HIGH'})` : 'ANALYSIS PENDING'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">OVERALL RISK SCORE:</span>
                    <span className={`font-bold text-xs ${
                      currentRiskScore >= 65 ? 'text-rose-400' : currentRiskScore >= 35 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {currentRiskScore} / 100 {currentRiskScore >= 65 ? '🔴 CRITICAL' : currentRiskScore >= 35 ? '🟡 MEDIUM' : '🟢 LOW'}
                    </span>
                  </div>
                </div>

                {/* Core Impersonation Explainer */}
                {callState === 'VOICE_IMPERSONATION_WARNING' || currentRiskScore >= 65 ? (
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-[9px] text-rose-300 leading-tight">
                    <strong>AI Impersonation Alert:</strong> Cloned voice exhibits high speaker similarity ({speakerSimilarityScore}%) but low voice authenticity ({voiceAuthenticityScore}%), indicating neural voice synthesis.
                  </div>
                ) : null}
              </div>

              {/* State 8 & 9: Sensitive Action Hold Notification (Emergency Wire ₹25,00,000) */}
              {(callState === 'SENSITIVE_ACTION_DETECTED' || callState === 'ACTION_HOLD') && !actionHoldDismissed && (
                <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/80 shadow-2xl text-xs font-mono space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-800">
                    <span className="text-rose-300 font-bold flex items-center gap-1.5 text-[10px]">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>SENSITIVE ACTION DETECTED</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 border border-rose-700">
                      CRITICAL
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-200">
                    Caller requested: <strong className="text-rose-300">"Approve an emergency offshore wire transfer."</strong>
                  </div>

                  <div className="flex justify-between items-center bg-rose-950/60 p-1.5 rounded border border-rose-900 text-[10px]">
                    <span className="text-slate-400">Simulated Amount:</span>
                    <strong className="text-rose-300 text-xs font-bold">₹25,00,000</strong>
                  </div>

                  <div className="p-1.5 rounded bg-rose-900/40 border border-rose-700/60 text-[9px] text-rose-200">
                    <strong>SECURITY RESPONSE: 🔴 ACTION ON HOLD</strong>
                    <p className="m-0 mt-0.5 text-slate-300">
                      Automated defense held transfer pending step-up verification. No real transaction executed.
                    </p>
                  </div>

                  {/* Step-Up Verification Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-[9px]">
                    <button
                      onClick={() => handleExecuteVerification('MFA')}
                      disabled={verificationLoading}
                      className="py-1.5 px-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded font-bold uppercase text-center cursor-pointer"
                    >
                      REQUEST MFA
                    </button>
                    <button
                      onClick={() => handleExecuteVerification('CALLBACK')}
                      disabled={verificationLoading}
                      className="py-1.5 px-1 bg-rose-900 hover:bg-rose-800 text-rose-200 border border-rose-600 rounded font-bold uppercase text-center cursor-pointer"
                    >
                      CALLBACK
                    </button>
                    <button
                      onClick={() => handleExecuteVerification('SUPERVISOR')}
                      disabled={verificationLoading}
                      className="py-1.5 px-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded font-bold uppercase text-center cursor-pointer"
                    >
                      SUPERVISOR
                    </button>
                  </div>

                  {verificationSuccess && (
                    <div className="text-[9px] text-emerald-400 font-mono mt-1">
                      ✓ {verificationSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* Standard In-Call Controls (Mute, Speaker, End) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-around px-4">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-full border transition cursor-pointer ${
                      isMuted
                        ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`p-3 rounded-full border transition cursor-pointer ${
                      isSpeakerOn
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleExecuteVerification('CALLBACK')}
                    className="p-3 rounded-full bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
                    title="Out-of-band Supervisor Callback"
                  >
                    <PhoneForwarded className="w-5 h-5 text-amber-400" />
                  </button>
                </div>

                {/* Hang Up Button */}
                <button
                  onClick={handleEndCall}
                  className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>END CALL</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 11: CALL ENDED (TRANSITION STATE) */}
          {/* ========================================================================= */}
          {callState === 'CALL_ENDED' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 font-mono">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 animate-pulse">
                <PhoneOff className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200 m-0">Call Ended</h3>
                <p className="text-xs text-slate-400 mt-1">Generating VoiceGuard Security Report...</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STATE 12: POST-CALL SECURITY REPORT */}
          {/* ========================================================================= */}
          {callState === 'POST_CALL_REPORT' && (
            <div className="flex-1 flex flex-col justify-between py-2 space-y-3 overflow-y-auto animate-in fade-in duration-300">
              <div className="text-center pt-1">
                <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-cyan-500/10">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100 m-0">
                  Call Security Summary
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Session ID: <strong className="text-slate-200">{activeCallId || 'CALL-DEMO-001'}</strong>
                </p>
              </div>

              {/* Dossier Breakdown */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Caller Identity:</span>
                  <strong className="text-slate-200">{callerName} ({callerRole})</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Speaker Match:</span>
                  <span className="font-bold text-cyan-400">
                    {speakerSimilarityScore > 0 ? `${speakerSimilarityScore}%` : 'NOT ENROLLED'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Voice Authenticity:</span>
                  <span className={`font-bold ${voiceAuthenticityScore < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {voiceAuthenticityScore > 0 ? `${voiceAuthenticityScore}% (${voiceAuthenticityScore < 40 ? 'LOW' : 'HIGH'})` : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Peak Risk Observed:</span>
                  <span className={`font-bold ${maxObservedRisk >= 65 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {maxObservedRisk} / 100 ({maxObservedRisk >= 65 ? 'CRITICAL' : 'SAFE'})
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Protected Actions:</span>
                  <span className="font-bold text-rose-300">
                    {activeScenario === 'CLONED_IMPERSONATION' ? '₹25,00,000 WIRE HELD' : 'NONE'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Cryptographic Audit:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SHA-256 RECORDED</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Navigate to Control Center or Return to Standby */}
              <div className="space-y-2 pt-1">
                {onNavigateToControlCenter && (
                  <button
                    onClick={() => onNavigateToControlCenter('overview')}
                    className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition cursor-pointer"
                  >
                    <Building className="w-4 h-4" />
                    <span>VIEW IN SECURITY CONTROL CENTER</span>
                  </button>
                )}

                {onNavigateToAuditLedger && (
                  <button
                    onClick={onNavigateToAuditLedger}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>INSPECT AUDIT LEDGER BLOCK</span>
                  </button>
                )}

                <button
                  onClick={() => setCallState('IDLE')}
                  className="w-full py-2 text-center text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Return to Phone Standby
                </button>
              </div>
            </div>
          )}

          {/* Smartphone Bottom Home Bar */}
          <div className="pt-2 flex justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
