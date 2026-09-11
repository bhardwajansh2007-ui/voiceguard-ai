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
  Layers,
  Network,
  Grid,
  ChevronDown,
  ChevronUp,
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
  initialScenario?: DemoScenario;
  onNavigateToAuditLedger?: () => void;
  onNavigateToControlCenter?: (tab?: string) => void;
}

export type CallStage =
  | 'INCOMING'      // Normal Incoming Call on device
  | 'ACTIVE'        // Normal Active Call on device
  | 'ENDED'         // Call Disconnected
  | 'REPORT';       // Post-Call Security Summary

export type DemoScenario = 'LEGITIMATE' | 'CLONED_IMPERSONATION' | 'UNKNOWN_CALLER';

export const ProtectedPhone: React.FC<ProtectedPhoneProps> = ({
  initialScenario = 'CLONED_IMPERSONATION',
  onNavigateToAuditLedger,
  onNavigateToControlCenter,
}) => {
  // Call Lifecycle on the device (Starts naturally with an incoming call)
  const [callStage, setCallStage] = useState<CallStage>('INCOMING');
  const [activeScenario, setActiveScenario] = useState<DemoScenario>(initialScenario);

  // Caller Information (Existing Phone Environment)
  const [callerName, setCallerName] = useState('Aarav Mehta');
  const [callerOrg, setCallerOrg] = useState('DemoBank Secure');
  const [callerRole, setCallerRole] = useState('Finance Operations');
  const [callerHandle, setCallerHandle] = useState('EMP-DEMO-001');
  const [callerNumber, setCallerNumber] = useState('+91 98000 12345');
  const [isEnrolledCaller, setIsEnrolledCaller] = useState(true);

  // Active Session & Duration
  const [activeCallId, setActiveCallId] = useState<string>('');
  const [activeCallSession, setActiveCallSession] = useState<CallSession | null>(null);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showArchDetails, setShowArchDetails] = useState(false);

  // VoiceGuard Security Layer Telemetry
  const [modelHealth, setModelHealth] = useState<ModelHealth | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Dynamic Security Evaluation
  const [currentRiskScore, setCurrentRiskScore] = useState<number>(14);
  const [speakerSimilarityScore, setSpeakerSimilarityScore] = useState<number>(94);
  const [voiceAuthenticityScore, setVoiceAuthenticityScore] = useState<number>(91);
  const [maxObservedRisk, setMaxObservedRisk] = useState<number>(14);
  const [isAnomalyDetected, setIsAnomalyDetected] = useState(false);
  const [isImpersonationDetected, setIsImpersonationDetected] = useState(false);
  const [isSensitiveActionTriggered, setIsSensitiveActionTriggered] = useState(false);
  const [isActionOnHold, setIsActionOnHold] = useState(false);

  // Verification State
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [postCallSummary, setPostCallSummary] = useState<CallDetailResponse | null>(null);

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
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onAudioChunk: handleAudioChunk,
  });

  // Fetch Authoritative Model Status from Single Backend Source
  useEffect(() => {
    const fetchModelStatus = async () => {
      try {
        const health = await api.models.getStatus();
        setModelHealth(health);
      } catch (err) {
        console.error('Failed to query model health:', err);
      }
    };
    fetchModelStatus();
  }, []);

  // Call Duration Timer
  useEffect(() => {
    let interval: any;
    if (callStage === 'ACTIVE') {
      interval = setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDurationSec(0);
    }
    return () => clearInterval(interval);
  }, [callStage]);

  // Track Peak Observed Risk
  useEffect(() => {
    if (currentRiskScore > maxObservedRisk) {
      setMaxObservedRisk(currentRiskScore);
    }
  }, [currentRiskScore, maxObservedRisk]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Switch Scenario via External Evaluator Controls
  const handleSelectScenario = (scenario: DemoScenario) => {
    setActiveScenario(scenario);
    setVerificationSuccess(null);
    setLiveAnalysis(null);
    setIsAnomalyDetected(false);
    setIsImpersonationDetected(false);
    setIsSensitiveActionTriggered(false);
    setIsActionOnHold(false);

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
      // Unknown Caller
      setCallerName('Unknown Caller');
      setCallerOrg('External Communication Channel');
      setCallerRole('Unverified Subscriber');
      setCallerHandle('UNVERIFIED');
      setCallerNumber('+91 91234 56789');
      setIsEnrolledCaller(false);
      setCurrentRiskScore(28);
      setSpeakerSimilarityScore(0);
      setVoiceAuthenticityScore(0);
      setMaxObservedRisk(28);
    }

    setCallStage('INCOMING');
  };

  useEffect(() => {
    if (initialScenario) {
      handleSelectScenario(initialScenario);
    }
  }, [initialScenario]);

  // Answer Incoming Call -> Normal In-Call begins, VoiceGuard Overlay analyzes audio
  const handleAnswerCall = async () => {
    setStreamError(null);
    const sessionSuffix = Date.now().toString().slice(-4);
    const sessionCallId = `CALL-${callerHandle.replace(/[^A-Za-z0-9]/g, '')}-${sessionSuffix}`;
    setActiveCallId(sessionCallId);

    try {
      // 1. Register monitored communication session in SQLite
      const created = await api.calls.create({
        call_id: sessionCallId,
        source_type: 'MOBILE_SECURITY_LAYER',
        action_type: activeScenario === 'CLONED_IMPERSONATION' ? 'EMERGENCY_WIRE_TRANSFER' : 'SECURE_CONVERSATION',
        action_sensitivity: activeScenario === 'CLONED_IMPERSONATION' ? 'CRITICAL' : isEnrolledCaller ? 'MEDIUM' : 'HIGH',
        transaction_amount: activeScenario === 'CLONED_IMPERSONATION' ? 2500000 : undefined,
        claimed_identity: `${callerName} (${callerRole})`,
        caller_id: callerNumber,
        authentication_state: isEnrolledCaller ? 'VOICE_CHALLENGE_ACTIVE' : 'UNVERIFIED',
      });
      setActiveCallSession(created);

      // 2. Connect WebSocket client for real-time acoustic analysis
      const client = new VoiceStreamClient(
        sessionCallId,
        (update) => {
          setLiveAnalysis(update);
          if (update.overall_risk_score) {
            setCurrentRiskScore(Math.round(update.overall_risk_score));
          }
        },
        (errMsg) => setStreamError(errMsg),
        () => startRecording(),
        (buf) => setBufferStatus(buf)
      );

      streamClientRef.current = client;
      client.connect();

      setCallStage('ACTIVE');

      // Controlled Sequence for Cloned Impersonation Demonstration
      if (activeScenario === 'CLONED_IMPERSONATION') {
        // After 6s: Acoustic Anomaly detected (State 2: Warning)
        setTimeout(() => {
          setCurrentRiskScore(42);
          setVoiceAuthenticityScore(65);
          setIsAnomalyDetected(true);
        }, 6000);

        // After 11s: Synthetic speech detected (State 3: Impersonation Alert)
        setTimeout(() => {
          setCurrentRiskScore(82);
          setVoiceAuthenticityScore(18);
          setSpeakerSimilarityScore(94);
          setIsImpersonationDetected(true);
        }, 11000);

        // After 16s: Caller requests sensitive ₹25,00,000 emergency wire
        setTimeout(() => {
          setIsSensitiveActionTriggered(true);
        }, 16000);

        // After 19s: VoiceGuard Automated Policy executes Action Hold
        setTimeout(async () => {
          setIsActionOnHold(true);
          try {
            await api.security.simulateSensitiveAction({
              call_id: sessionCallId,
              action_type: 'EMERGENCY_WIRE_TRANSFER',
              action_description: 'Emergency wire transfer of ₹25,00,000',
              simulated_amount: 2500000,
            });
          } catch (e) {
            console.error('Failed to register action hold:', e);
          }
        }, 19000);
      }
    } catch (err: any) {
      setStreamError(err.message || 'Failed to initialize voice security analysis session');
    }
  };

  // Decline Call
  const handleDeclineCall = () => {
    handleStopStream();
    setCallStage('ENDED');
    setTimeout(() => setCallStage('INCOMING'), 2000);
  };

  // End Call -> Disconnect & Fetch Post-Communication Report
  const handleEndCall = async () => {
    setCallStage('ENDED');
    handleStopStream();

    if (activeCallId) {
      try {
        await api.calls.end(activeCallId);
        const detail = await api.calls.get(activeCallId);
        setPostCallSummary(detail);
      } catch (err) {
        console.error('Failed to finalize communication session:', err);
      }
    }

    setTimeout(() => {
      setCallStage('REPORT');
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

  // Execute Step-Up Verification Action
  const handleExecuteVerification = async (method: 'MFA' | 'CALLBACK' | 'SUPERVISOR') => {
    if (!activeCallId) return;
    setVerificationLoading(true);

    try {
      if (method === 'CALLBACK') {
        await api.security.initiateVerification(
          activeCallId,
          'SUPERVISOR_CALLBACK',
          `Out-of-band verification callback to ${callerNumber}`
        );
        setVerificationSuccess(`Out-of-band callback initiated to ${callerNumber}. Untrusted session held.`);
      } else if (method === 'MFA') {
        await api.security.initiateVerification(
          activeCallId,
          'MFA_CHALLENGE',
          `Push challenge dispatched to enrolled token for ${callerHandle}`
        );
        setVerificationSuccess(`Push challenge sent to ${callerHandle}'s enrolled authenticator.`);
      } else {
        setVerificationSuccess('Communication escalated to Security Operations Center (SOC).');
      }
    } catch (err: any) {
      setVerificationSuccess(err.message || 'Verification signal recorded.');
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 pb-8">
      {/* ========================================================================= */}
      {/* 1. CORE HERO STATEMENT & SECURITY LAYER ARCHITECTURE BANNER */}
      {/* ========================================================================= */}
      <div className="w-full max-w-xl p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-cyan-950/40 border border-cyan-500/30 text-slate-200 shadow-xl backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shrink-0 mt-0.5 shadow-md shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                SECURITY LAYER ARCHITECTURE
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>PROTECTION ACTIVE</span>
              </span>
            </div>

            <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight leading-snug m-0">
              "VOICEGUARD DOESN'T REPLACE YOUR PHONE. IT PROTECTS THE VOICE COMMUNICATIONS RUNNING THROUGH IT."
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed m-0">
              Operating like endpoint security for voice, VoiceGuard adds an AI-driven trust layer to supported communication channels. It does not replace the dialer or own the call.
            </p>
          </div>
        </div>

        {/* Collapsible Architecture Model */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <button
            onClick={() => setShowArchDetails(!showArchDetails)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer text-[11px]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showArchDetails ? 'Hide' : 'View'} Architectural Security Diagram</span>
            {showArchDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onNavigateToControlCenter && (
            <button
              onClick={() => onNavigateToControlCenter('overview')}
              className="text-slate-300 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer text-[11px]"
            >
              <span>Enterprise Control Center</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {showArchDetails && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold text-cyan-300 uppercase tracking-wide">
              VoiceGuard Real-World Security Flow:
            </div>
            <pre className="p-2.5 rounded bg-slate-900 border border-slate-800/80 text-[9px] text-slate-300 leading-relaxed font-mono overflow-x-auto whitespace-pre">
{`EXISTING COMMUNICATION ENVIRONMENT (User Phone / VoIP / Supported App)
        │
        ▼ (voice stream)
VOICEGUARD SECURITY LAYER
        │
        ├── Voice Anti-Spoofing (AASIST / Acoustic Anomaly)
        ├── Speaker Verification (128-D Acoustic Embeddings)
        ├── Behavioral Analysis (Pitch / Energy / Pauses)
        ├── Caller Intelligence (Identity Reputation)
        ├── Contextual Risk Engine
        └── Risk Fusion Engine (Unified 0-100 Score)
        │
        ▼
SECURITY POLICY ENGINE
        │
        ├── ALLOW (Low Risk → Call Proceeds Normally)
        ├── WARN  (Elevated Risk → Anomaly Notification)
        ├── VERIFY (High Risk → Step-Up Identity Challenge)
        └── ACTION HOLD (Sensitive Request → Wire Frozen)
        │
        ▼
ENTERPRISE SECURITY CONTROL CENTER & SHA-256 AUDIT LEDGER`}
            </pre>
            <div className="text-[9px] text-slate-400">
              * SIH Prototype Demonstration: Consumes audio stream via secure gateway. Production deployment utilizes platform communication SDK/API permissions without universal cellular audio interception.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. SIH EVALUATION CONTROLS (OUTSIDE THE PHONE - NOT INSIDE THE PHONE!) */}
      {/* ========================================================================= */}
      <div className="w-full max-w-xl p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-sm shadow-md">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>SIH DEMO EVALUATOR CONTROLS: SIMULATE INBOUND STREAM</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
            TEST INPUTS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          <button
            onClick={() => handleSelectScenario('LEGITIMATE')}
            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
              activeScenario === 'LEGITIMATE'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="font-bold flex items-center gap-1">
              <PhoneIncoming className="w-3 h-3 text-emerald-400" />
              <span>1. Legitimate Call</span>
            </div>
            <div className="text-[9px] opacity-75 mt-0.5">Aarav Mehta · Authentic Voice</div>
          </button>

          <button
            onClick={() => handleSelectScenario('CLONED_IMPERSONATION')}
            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
              activeScenario === 'CLONED_IMPERSONATION'
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>2. Cloned Voice (₹25L Hold)</span>
            </div>
            <div className="text-[9px] opacity-75 mt-0.5">Synthetic Clone · Wire Fraud</div>
          </button>

          <button
            onClick={() => handleSelectScenario('UNKNOWN_CALLER')}
            className={`p-2 rounded-lg border text-left transition cursor-pointer ${
              activeScenario === 'UNKNOWN_CALLER'
                ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <div className="font-bold flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>3. Unknown Caller</span>
            </div>
            <div className="text-[9px] opacity-75 mt-0.5">Unverified ≠ Malicious</div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PHYSICAL SMARTPHONE CANVAS (GENERIC PHONE + VOICEGUARD OVERLAY) */}
      {/* ========================================================================= */}
      <div className="relative w-full max-w-[390px] h-[780px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-cyan-500/20 flex flex-col overflow-hidden select-none">
        {/* Dynamic Island Notch */}
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
          {/* Top Device Status Bar (Carrier, Time, Battery) */}
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
          {/* STAGE 1: INCOMING CALL (GENERIC PHONE + VOICEGUARD OVERLAY) */}
          {/* ========================================================================= */}
          {callStage === 'INCOMING' && (
            <div className="flex-1 flex flex-col justify-between py-2 animate-in fade-in zoom-in-95 duration-200">
              {/* Layer 1: Normal Generic Phone Call UI */}
              <div className="text-center pt-3">
                <span className="text-[11px] font-sans font-medium tracking-wide text-slate-400">
                  Incoming Call...
                </span>

                {/* Generic Phone Caller Avatar */}
                <div className="relative mx-auto mt-4 mb-2 w-24 h-24 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700/80 flex items-center justify-center text-slate-200 shadow-xl">
                  <User className="w-12 h-12 text-slate-300" />
                  {isEnrolledCaller && (
                    <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-slate-900 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-100 m-0">
                  {callerName}
                </h2>
                <p className="text-xs text-slate-300 font-medium m-0 mt-0.5">
                  {callerOrg}
                </p>
                <p className="text-[11px] font-mono text-slate-400 m-0">
                  {callerNumber}
                </p>
              </div>

              {/* Layer 2: VOICEGUARD SECURITY OVERLAY (FLOATING OVER THE CALL) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/95 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10 text-xs font-mono space-y-2 backdrop-blur-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>VOICEGUARD CALL PROTECTION</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                    LAYER ACTIVE
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Claimed Identity:</span>
                    <strong className="text-slate-200">
                      {callerName} ({isEnrolledCaller ? 'EMP-DEMO-001' : 'UNENROLLED'})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Identity Status:</span>
                    <span className={`font-bold ${isEnrolledCaller ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isEnrolledCaller ? '✓ VERIFIED SPEAKER' : '⚪ UNVERIFIED CALLER'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pre-Call Risk:</span>
                    <span className="font-bold text-slate-200">
                      {currentRiskScore} / 100 ({isEnrolledCaller ? '🟢 LOW RISK' : '⚪ UNVERIFIED'})
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                  <span>Voice Analysis:</span>
                  <span className="text-cyan-400 font-bold">ARMED · READY FOR STREAM</span>
                </div>
              </div>

              {/* Normal Generic Phone Call Action Buttons (Decline / Answer) */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={handleDeclineCall}
                  className="py-3 px-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline</span>
                </button>

                <button
                  onClick={handleAnswerCall}
                  className="py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer animate-pulse"
                >
                  <Phone className="w-4 h-4" />
                  <span>Answer</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: ACTIVE CALL (GENERIC IN-CALL + VOICEGUARD SECURITY OVERLAY) */}
          {/* ========================================================================= */}
          {callStage === 'ACTIVE' && (
            <div className="flex-1 flex flex-col justify-between py-2 relative overflow-hidden">
              {/* Layer 1: Normal In-Call UI */}
              <div className="text-center pt-2">
                <h3 className="text-xl font-bold text-slate-100 m-0">
                  {callerName}
                </h3>
                <p className="text-xs text-slate-400 m-0">
                  {callerOrg} · {callerNumber}
                </p>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                  {formatTime(callDurationSec)}
                </div>
              </div>

              {/* Layer 2: VOICEGUARD DOCKED / FLOATING SECURITY OVERLAY */}
              <div className={`my-2 p-3 rounded-2xl border-2 transition-all duration-300 text-xs font-mono space-y-2 shadow-2xl backdrop-blur-md ${
                isImpersonationDetected || isActionOnHold
                  ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/40'
                  : isAnomalyDetected
                  ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 shadow-amber-900/30'
                  : 'bg-slate-900/95 border-emerald-500/50 text-slate-200 shadow-cyan-500/10'
              }`}>
                {/* Security Overlay Header & State Badge */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5 font-bold text-[10px]">
                    <Shield className={`w-3.5 h-3.5 ${isImpersonationDetected ? 'text-rose-400' : isAnomalyDetected ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>
                      {isImpersonationDetected
                        ? '🔴 VOICEGUARD SECURITY ALERT'
                        : isAnomalyDetected
                        ? '🟡 VOICEGUARD WARNING'
                        : '🟢 VOICEGUARD PROTECTION ACTIVE'}
                    </span>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    isImpersonationDetected
                      ? 'bg-rose-900 text-rose-200 border border-rose-700'
                      : isAnomalyDetected
                      ? 'bg-amber-900 text-amber-200 border border-amber-700'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {isImpersonationDetected ? 'CRITICAL RISK' : isAnomalyDetected ? 'ANOMALY DETECTED' : 'SAFE COMMUNICATION'}
                  </span>
                </div>

                {/* Acoustic Audio Waveform */}
                <div className="h-8 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800/80 flex items-center justify-center px-1">
                  {analyserNode ? (
                    <WaveformVisualizer
                      analyserNode={analyserNode}
                      isActive={isRecording}
                      height={32}
                      color={isImpersonationDetected ? '#f43f5e' : isAnomalyDetected ? '#fbbf24' : '#06b6d4'}
                    />
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      <Activity className="w-3 h-3 animate-pulse" />
                      <span>Voice Security Analysis Active</span>
                    </div>
                  )}
                </div>

                {/* Telemetry Breakdown: Identity vs Authenticity */}
                <div className="space-y-1 pt-1 border-t border-slate-800/60 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Speaker Match:</span>
                    <span className={`font-bold ${speakerSimilarityScore > 75 ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {speakerSimilarityScore > 0 ? `${speakerSimilarityScore}%` : 'NOT ENROLLED'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Voice Authenticity:</span>
                    <span className={`font-bold ${voiceAuthenticityScore < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {voiceAuthenticityScore > 0 ? `${voiceAuthenticityScore}%` : 'ANALYZING STREAM...'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Risk Assessment:</span>
                    <span className={`font-bold ${isImpersonationDetected ? 'text-rose-400' : isAnomalyDetected ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {currentRiskScore} / 100
                    </span>
                  </div>
                </div>

                {/* Alert Explanatory Note on Impersonation Detection */}
                {isImpersonationDetected && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800/80 text-[9px] text-rose-200 leading-tight">
                    <strong>Potential Voice Impersonation Detected:</strong> High speaker similarity ({speakerSimilarityScore}%) coupled with low voice authenticity ({voiceAuthenticityScore}%) indicates synthetic speech synthesis.
                  </div>
                )}
              </div>

              {/* SENSITIVE ACTION HOLD OVERLAY (SIMULATED ₹25,00,000 EMERGENCY WIRE) */}
              {(isSensitiveActionTriggered || isActionOnHold) && (
                <div className="p-3 rounded-xl bg-rose-950/95 border-2 border-rose-500 shadow-2xl text-xs font-mono space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between pb-1 border-b border-rose-800">
                    <span className="text-rose-300 font-bold flex items-center gap-1.5 text-[10px]">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>SENSITIVE REQUEST DETECTED</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 border border-rose-700">
                      CRITICAL
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-200">
                    Caller requested: <strong className="text-rose-300">"Approve an emergency offshore wire transfer."</strong>
                  </div>

                  <div className="flex justify-between items-center bg-rose-950/70 p-1.5 rounded border border-rose-900 text-[10px]">
                    <span className="text-slate-400">Simulated Action:</span>
                    <strong className="text-rose-300 text-xs font-bold">₹25,00,000 Financial Wire</strong>
                  </div>

                  <div className="p-1.5 rounded bg-rose-900/50 border border-rose-700 text-[9px] text-rose-200">
                    <strong>SECURITY DECISION: 🔴 ACTION ON HOLD</strong>
                    <p className="m-0 mt-0.5 text-slate-300">
                      Automated defense policy held action pending step-up verification. (Simulated demonstration).
                    </p>
                  </div>

                  {/* Step-Up Identity Challenge Buttons */}
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

              {/* Layer 1: Normal In-Call Phone Controls (Mute, Keypad, Speaker, End) */}
              <div className="space-y-4 pt-2">
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
                    title="Initiate Out-of-band Callback"
                  >
                    <PhoneForwarded className="w-5 h-5 text-amber-400" />
                  </button>
                </div>

                {/* Normal Generic Phone End Call Button */}
                <button
                  onClick={handleEndCall}
                  className="w-full py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: CALL ENDED */}
          {/* ========================================================================= */}
          {callStage === 'ENDED' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 font-mono">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 animate-pulse">
                <PhoneOff className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200 m-0">Call Disconnected</h3>
                <p className="text-xs text-slate-400 mt-1">Finalizing VoiceGuard Security Audit...</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 4: POST-COMMUNICATION SECURITY SUMMARY */}
          {/* ========================================================================= */}
          {callStage === 'REPORT' && (
            <div className="flex-1 flex flex-col justify-between py-2 space-y-3 overflow-y-auto animate-in fade-in duration-300">
              <div className="text-center pt-1">
                <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-cyan-500/10">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100 m-0">
                  VoiceGuard Security Summary
                </h3>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Monitored Session: <strong className="text-slate-200">{activeCallId || 'CALL-DEMO-001'}</strong>
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
                  <span className="text-slate-400">Cryptographic Ledger:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SHA-256 SEALED</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
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
                  onClick={() => setCallStage('INCOMING')}
                  className="w-full py-2 text-center text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Simulate Next Inbound Stream
                </button>
              </div>
            </div>
          )}

          {/* Device Home Indicator */}
          <div className="pt-2 flex justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
