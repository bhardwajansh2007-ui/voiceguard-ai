import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Mic,
  MicOff,
  Upload,
  Smartphone,
  Plus,
  RefreshCw,
  Activity,
  ArrowUpRight,
  Shield,
  Layers,
  FileAudio,
  Radio,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CallSession, CallDetailResponse, StreamingAnalysisUpdate, BufferStatusUpdate } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { ConnectDeviceModal } from '../components/ConnectDeviceModal';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

interface ProtectedCallsProps {
  initialCallId?: string;
  onNavigateToLiveProtection: (callId?: string) => void;
}

export const ProtectedCalls: React.FC<ProtectedCallsProps> = ({
  initialCallId,
  onNavigateToLiveProtection,
}) => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>(initialCallId || '');
  const [callDetail, setCallDetail] = useState<CallDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Ingestion Mode tab: 'MIC' | 'UPLOAD' | 'REMOTE'
  const [ingestionTab, setIngestionTab] = useState<'MIC' | 'UPLOAD' | 'REMOTE'>('MIC');

  // WebSocket Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamClient, setStreamClient] = useState<VoiceStreamClient | null>(null);
  const streamClientRef = useRef<VoiceStreamClient | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Modals & Forms
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCallAction, setNewCallAction] = useState('WIRE_TRANSFER');
  const [newCallSensitivity, setNewCallSensitivity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [newCallAmount, setNewCallAmount] = useState('');
  const [newCallIdentity, setNewCallIdentity] = useState('');
  const [newCallSource, setNewCallSource] = useState('COMMUNICATION_SANDBOX');
  const [creatingCall, setCreatingCall] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const loadCalls = async () => {
    try {
      const data = await api.calls.list();
      setCalls(data);
      if (!selectedCallId && data.length > 0) {
        setSelectedCallId(data[0].call_id);
      }
    } catch (err) {
      console.error('Failed to list calls:', err);
    }
  };

  const loadCallDetail = async (callId: string) => {
    if (!callId) return;
    setLoading(true);
    try {
      const data = await api.calls.get(callId);
      setCallDetail(data);
    } catch (err) {
      console.error('Failed to load call detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    if (initialCallId) {
      setSelectedCallId(initialCallId);
    }
  }, [initialCallId]);

  useEffect(() => {
    if (selectedCallId) {
      loadCallDetail(selectedCallId);
      setLiveAnalysis(null);
      setBufferStatus(null);
      setStreamError(null);
    }
  }, [selectedCallId]);

  const handleStartStream = async () => {
    if (!selectedCallId) return;
    setStreamError(null);

    const client = new VoiceStreamClient(
      selectedCallId,
      (update) => {
        setLiveAnalysis(update);
        if (update.recommended_action === 'HOLD_SENSITIVE_ACTION') {
          loadCallDetail(selectedCallId);
        }
      },
      (errorMsg) => {
        setStreamError(errorMsg);
        handleStopStream();
      },
      () => {
        setIsStreaming(true);
        startRecording();
      },
      (buffer) => {
        setBufferStatus(buffer);
      },
      (count) => {
        setParticipantsCount(count);
      }
    );

    streamClientRef.current = client;
    setStreamClient(client);
    client.connect();
  };

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
    if (selectedCallId) {
      loadCallDetail(selectedCallId);
    }
  };

  const handleLaunchScenario = async (scenario: 'LEGITIMATE' | 'CLONED' | 'SUSPICIOUS') => {
    setCreatingCall(true);
    setStreamError(null);
    try {
      const randId = Math.floor(1000 + Math.random() * 9000);
      let payload;
      if (scenario === 'LEGITIMATE') {
        payload = {
          call_id: `SEC-EXEC-LEGIT-${randId}`,
          source_type: 'ENTERPRISE_SIP',
          action_type: 'QUARTERLY_BUDGET_APPROVAL',
          action_sensitivity: 'MEDIUM' as const,
          transaction_amount: 250000,
          claimed_identity: 'Aarav Mehta (Finance Operations)',
          caller_id: '+91 98000 12345',
          authentication_state: 'AUTHENTICATED',
        };
      } else if (scenario === 'CLONED') {
        payload = {
          call_id: `SEC-FRAUD-HOLD-${randId}`,
          source_type: 'COMMUNICATION_SANDBOX',
          action_type: 'EMERGENCY_WIRE_TRANSFER',
          action_sensitivity: 'CRITICAL' as const,
          transaction_amount: 2500000,
          claimed_identity: 'Aarav Mehta (Finance Operations)',
          caller_id: '+91 98000 12345',
          authentication_state: 'VOICE_CHALLENGE_ACTIVE',
        };
      } else {
        payload = {
          call_id: `SEC-ANOMALY-EXT-${randId}`,
          source_type: 'EXTERNAL_GATEWAY',
          action_type: 'OTP_CREDENTIAL_VERIFICATION',
          action_sensitivity: 'HIGH' as const,
          transaction_amount: undefined,
          claimed_identity: undefined,
          caller_id: '+91 1800 00 9999',
          authentication_state: 'UNVERIFIED',
        };
      }

      const newCall = await api.calls.create(payload);
      await loadCalls();
      setSelectedCallId(newCall.call_id);
    } catch (err: any) {
      setStreamError(err.message || 'Failed to initialize evaluation scenario');
    } finally {
      setCreatingCall(false);
    }
  };

  const handleCreateCall = async () => {
    setCreatingCall(true);
    setStreamError(null);
    try {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newCall = await api.calls.create({
        call_id: `CALL-${newCallAction.substring(0, 4)}-${randomSuffix}`,
        source_type: newCallSource,
        action_type: newCallAction,
        action_sensitivity: newCallSensitivity,
        transaction_amount: newCallAmount ? parseFloat(newCallAmount) : undefined,
        claimed_identity: newCallIdentity.trim() || undefined,
        caller_id: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        authentication_state: 'VOICE_CHALLENGE_ACTIVE',
      });
      await loadCalls();
      setSelectedCallId(newCall.call_id);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setStreamError(err.message || 'Failed to create simulated session');
    } finally {
      setCreatingCall(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCallId) return;

    setUploadLoading(true);
    setUploadSuccess(null);
    setStreamError(null);

    try {
      await api.calls.uploadAudio(selectedCallId, file);
      setUploadSuccess(`Audio sample "${file.name}" analyzed through ML inference pipeline. Telemetry updated.`);
      await loadCallDetail(selectedCallId);
    } catch (err: any) {
      setStreamError(err.message || 'Audio upload analysis failed.');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const activeCall = calls.find((c) => c.call_id === selectedCallId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Protected Calls Test Harness
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              EVALUATION ENVIRONMENT
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise controlled communication environment. Test live microphone streams, forensic audio recordings, or simulated telecom channels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCalls}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition"
            title="Refresh Protected Sessions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs font-mono uppercase rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Custom Session</span>
          </button>
          <button
            onClick={() => onNavigateToLiveProtection(selectedCallId)}
            disabled={!selectedCallId}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>SOC Telemetry</span>
          </button>
        </div>
      </div>

      {/* 3 SIH 2026 Evaluation Scenarios */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Evaluation Scenarios (SIH 2026 Judging Presets)
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              ONE-CLICK LAUNCH
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Zero synthetic mock data; runs real model pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Scenario 1 */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Scenario 1: Legitimate Executive
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ALLOW
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Known enrolled executive <strong>Aarav Mehta</strong> requesting ₹2,50,000 budget approval. Authentic voice matching reference embeddings.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario('LEGITIMATE')}
              disabled={creatingCall}
              className="mt-3 w-full py-1.5 text-[11px] font-mono font-semibold uppercase rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>Launch Legitimate Session</span>
            </button>
          </div>

          {/* Scenario 2 */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-rose-500/40 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Scenario 2: Cloned Wire Fraud
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  HOLD SENSITIVE ACTION
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Cloned synthetic voice claiming to be <strong>Aarav Mehta</strong> urgently demanding ₹25,00,000 offshore wire. Anti-spoof triggers automated hold.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario('CLONED')}
              disabled={creatingCall}
              className="mt-3 w-full py-1.5 text-[11px] font-mono font-semibold uppercase rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>Launch Cloned Fraud Session</span>
            </button>
          </div>

          {/* Scenario 3 */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Scenario 3: Suspicious Caller
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  STEP-UP / BLOCK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Unregistered external number requesting OTP/credential changes. High caller risk, no biometric reference on file.
              </p>
            </div>
            <button
              onClick={() => handleLaunchScenario('SUSPICIOUS')}
              disabled={creatingCall}
              className="mt-3 w-full py-1.5 text-[11px] font-mono font-semibold uppercase rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/50 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3" />
              <span>Launch Suspicious Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Session Selector + Audio Ingestion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Protected Session Picker */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Active Protected Sessions
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {calls.length} Total
            </span>
          </div>

          <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
            {calls.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                No sessions initialized. Launch one of the scenarios above or create a custom session.
              </div>
            ) : (
              calls.map((c) => {
                const isSelected = c.call_id === selectedCallId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCallId(c.call_id)}
                    className={`p-3 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-sm shadow-cyan-500/10'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                        {c.call_id}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          c.status === 'HOLD'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : c.status === 'VERIFIED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                      {c.claimed_identity || 'External Unclaimed'} &bull; {c.action_type}
                    </div>

                    {c.transaction_amount && (
                      <div className="mt-1 text-[11px] text-amber-400 font-semibold">
                        Simulated: ₹{c.transaction_amount.toLocaleString()} ({c.action_sensitivity})
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ingestion Engine & Security Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Session Identity Header */}
          {activeCall ? (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">CURRENT FOCUS SESSION</span>
                <span className="text-cyan-400 font-bold text-sm">{activeCall.call_id}</span>
                <div className="text-slate-400 mt-0.5">
                  Claimed: <strong className="text-slate-200">{activeCall.claimed_identity || 'None'}</strong> | Source: {activeCall.source_type}
                </div>
              </div>

              <div className="text-right sm:text-right">
                <span className="text-[10px] text-slate-500 uppercase block">SECURITY ACTION STATE</span>
                <span
                  className={`inline-block text-xs font-bold px-2 py-0.5 rounded mt-0.5 ${
                    activeCall.status === 'HOLD'
                      ? 'bg-rose-950 text-rose-400 border border-rose-500/50'
                      : activeCall.status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {activeCall.status === 'HOLD' ? 'PROTECTED ACTION ON HOLD' : activeCall.status}
                </span>
                {activeCall.transaction_amount && (
                  <div className="text-amber-400 font-bold mt-1">
                    Hold Amount: ₹{activeCall.transaction_amount.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-500">
              Select or launch a session to attach security stream.
            </div>
          )}

          {/* Ingestion Channels Tabs */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
            <div className="flex border-b border-slate-800 pb-3 gap-2">
              <button
                onClick={() => setIngestionTab('MIC')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  ingestionTab === 'MIC'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Microphone Capture</span>
              </button>

              <button
                onClick={() => setIngestionTab('UPLOAD')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  ingestionTab === 'UPLOAD'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileAudio className="w-3.5 h-3.5" />
                <span>Audio File Ingestion</span>
              </button>

              <button
                onClick={() => setIngestionTab('REMOTE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
                  ingestionTab === 'REMOTE'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Secondary Device Bridge</span>
              </button>
            </div>

            {/* Ingestion Mode 1: Microphone */}
            {ingestionTab === 'MIC' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isStreaming
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/50 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isStreaming ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {isStreaming ? 'STREAMING AUDIO VIA SECURE WEBSOCKET' : 'MICROPHONE READY'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        16kHz 16-bit Mono PCM &bull; 3.0s sliding inference window
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!isStreaming ? (
                      <button
                        onClick={handleStartStream}
                        disabled={!selectedCallId}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-mono font-bold text-xs uppercase rounded-lg shadow-md shadow-cyan-600/20 transition cursor-pointer disabled:opacity-50"
                      >
                        Start Protection Stream
                      </button>
                    ) : (
                      <button
                        onClick={handleStopStream}
                        className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase rounded-lg shadow-md shadow-rose-600/20 transition cursor-pointer"
                      >
                        Halt Stream
                      </button>
                    )}
                  </div>
                </div>

                {/* Waveform Visualizer */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                  <div className="text-[10px] font-mono uppercase text-slate-500 mb-1 flex items-center justify-between">
                    <span>Acoustic Waveform Telemetry</span>
                    <span>Level: {(audioLevel * 100).toFixed(0)}%</span>
                  </div>
                  <WaveformVisualizer analyserNode={analyserNode} isActive={isStreaming} />
                </div>

                {/* Live Buffer Status */}
                {bufferStatus && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div>Buffer: {bufferStatus.buffered_seconds.toFixed(1)}s / {bufferStatus.target_seconds.toFixed(1)}s ({bufferStatus.progress_pct.toFixed(0)}%)</div>
                    <div className="text-cyan-400">Active Participants: {bufferStatus.participants_count}</div>
                  </div>
                )}
              </div>
            )}

            {/* Ingestion Mode 2: Audio File Upload */}
            {ingestionTab === 'UPLOAD' && (
              <div className="space-y-4">
                <div className="p-6 rounded-lg bg-slate-950/60 border border-dashed border-slate-700 text-center">
                  <FileAudio className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-xs font-mono font-bold text-slate-200">
                    Analyze Forensic Audio Recording
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                    Upload a WAV or MP3 recording. Audio will be evaluated through AASIST anti-spoof inference and ECAPA-TDNN biometric cosine distance.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading || !selectedCallId}
                    className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold text-xs uppercase rounded-lg border border-slate-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {uploadLoading ? 'Evaluating Audio...' : 'Select Audio File'}
                  </button>
                </div>

                {uploadSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ingestion Mode 3: Remote Device Bridge */}
            {ingestionTab === 'REMOTE' && (
              <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Multi-Device Testing Bridge
                  </span>
                  <button
                    onClick={() => setIsDeviceModalOpen(true)}
                    className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded border border-cyan-600/50 cursor-pointer"
                  >
                    Display Pairing QR
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Connect a secondary smartphone or laptop to test two-party voice protection across separated devices.
                </p>
              </div>
            )}

            {streamError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{streamError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connect Device Modal */}
      {isDeviceModalOpen && (
        <ConnectDeviceModal
          isOpen={isDeviceModalOpen}
          callId={selectedCallId}
          onClose={() => setIsDeviceModalOpen(false)}
        />
      )}

      {/* Custom Session Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 uppercase">Initialize Protected Session</span>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Protected Action Type</label>
                <input
                  type="text"
                  value={newCallAction}
                  onChange={(e) => setNewCallAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. WIRE_TRANSFER, CREDENTIAL_RESET"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Action Sensitivity</label>
                <select
                  value={newCallSensitivity}
                  onChange={(e) => setNewCallSensitivity(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                >
                  <option value="CRITICAL">CRITICAL (Strict Hold)</option>
                  <option value="HIGH">HIGH (Step-Up Verification)</option>
                  <option value="MEDIUM">MEDIUM (Standard Verify)</option>
                  <option value="LOW">LOW (Allow)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Simulated Transaction Amount (₹)</label>
                <input
                  type="number"
                  value={newCallAmount}
                  onChange={(e) => setNewCallAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. 2500000"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Claimed Identity (Optional)</label>
                <input
                  type="text"
                  value={newCallIdentity}
                  onChange={(e) => setNewCallIdentity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. Aarav Mehta (Finance Operations)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCall}
                disabled={creatingCall}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
              >
                {creatingCall ? 'Initializing...' : 'Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Disclaimer */}
      <PrototypeDisclaimer />
    </div>
  );
};
