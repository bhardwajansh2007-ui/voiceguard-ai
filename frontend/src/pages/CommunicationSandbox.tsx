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
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CallSession, CallDetailResponse, StreamingAnalysisUpdate, BufferStatusUpdate } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { ConnectDeviceModal } from '../components/ConnectDeviceModal';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

interface CommunicationSandboxProps {
  initialCallId?: string;
  onNavigateToLiveProtection: (callId?: string) => void;
}

export const CommunicationSandbox: React.FC<CommunicationSandboxProps> = ({
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
      console.error('Failed to get call details:', err);
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

  const handleCreateCall = async () => {
    setCreatingCall(true);
    setStreamError(null);
    try {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
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
      setUploadSuccess(`Audio file "${file.name}" analyzed. Telemetry updated.`);
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Communication Sandbox & Integration Simulator
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              SIMULATOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controlled test harness simulating PBX endpoints, VoIP channels, forensic audio ingestion, and protected actions
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToLiveProtection(selectedCallId)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 text-xs font-mono font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open in Live Protection SOC</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <select
              value={selectedCallId}
              onChange={(e) => setSelectedCallId(e.target.value)}
              disabled={isStreaming}
              className="bg-transparent text-xs font-mono text-cyan-300 focus:outline-none max-w-[200px]"
            >
              {calls.map((c) => (
                <option key={c.call_id} value={c.call_id} className="bg-slate-900 text-slate-200">
                  {c.call_id} — {c.action_type}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                loadCalls();
                if (selectedCallId) loadCallDetail(selectedCallId);
              }}
              title="Reload Session Data"
              className="p-1 text-slate-400 hover:text-cyan-400 rounded cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Disclaimer Notice */}
      <PrototypeDisclaimer compact />

      {calls.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-slate-200 uppercase">
              No Sandbox Sessions Configured
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Configure a simulated communication session with a sensitive protected action (e.g. Wire Transfer, Credential Reset) to test VoiceGuard AI's defense layer.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold font-mono text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sandbox Session</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Session Info Bar */}
          {callDetail && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">SESSION ID</span>
                <span className="font-bold text-cyan-400">{callDetail.call_id}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">SOURCE TYPE</span>
                <span className="text-slate-200 font-semibold">{callDetail.source_type}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">CLAIMED IDENTITY</span>
                <span className="text-cyan-300 font-semibold">{callDetail.claimed_identity || 'UNCLAIMED'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">ACTION TYPE</span>
                <span className="text-slate-200 font-semibold">{callDetail.action_type}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">SIMULATED VALUE</span>
                <span className="text-slate-200 font-semibold">
                  {callDetail.transaction_amount ? `₹${callDetail.transaction_amount.toLocaleString()}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-500 block">CURRENT STATUS</span>
                <span
                  className={`inline-block px-2 py-0.5 rounded font-bold ${
                    callDetail.status === 'HOLD'
                      ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                      : callDetail.status === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {callDetail.status}
                </span>
              </div>
            </div>
          )}

          {/* Ingestion Harness Selection Tabs */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Audio Ingestion Gateway & Source Channel
                </h3>
                <p className="text-xs text-slate-400">
                  Select how audio enters the VoiceGuard AI analysis pipeline
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setIngestionTab('MIC')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                    ingestionTab === 'MIC'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>1. Local Mic</span>
                </button>
                <button
                  onClick={() => setIngestionTab('UPLOAD')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                    ingestionTab === 'UPLOAD'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>2. Audio Upload</span>
                </button>
                <button
                  onClick={() => setIngestionTab('REMOTE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                    ingestionTab === 'REMOTE'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>3. 2-Device Simulator</span>
                </button>
              </div>
            </div>

            {/* Ingestion Mode 1: Local Microphone */}
            {ingestionTab === 'MIC' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono text-slate-300 font-semibold block">
                      Direct Browser Microphone Ingestion
                    </span>
                    <p className="text-xs text-slate-400">
                      Streams 16kHz PCM audio directly into the sliding analysis window over WebSocket
                    </p>
                  </div>

                  {!isStreaming ? (
                    <button
                      onClick={handleStartStream}
                      disabled={uploadLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-rose-600/30 transition cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Streaming Audio</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopStream}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-amber-600/30 transition cursor-pointer animate-pulse"
                    >
                      <MicOff className="w-4 h-4" />
                      <span>Stop Streaming</span>
                    </button>
                  )}
                </div>

                {isStreaming && (
                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>Sliding Analysis Buffer:</span>
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {bufferStatus ? `${bufferStatus.buffered_seconds}s / ${bufferStatus.target_seconds}s` : 'Buffering...'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                        style={{ width: `${bufferStatus ? bufferStatus.progress_pct : 10}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Mic Input Level: {Math.round(audioLevel * 100)}%</span>
                      <span>Window State: {bufferStatus ? `${bufferStatus.progress_pct}% full` : 'Listening'}</span>
                    </div>
                  </div>
                )}

                <WaveformVisualizer
                  analyserNode={analyserNode}
                  isActive={isRecording}
                  color={isRecording ? '#06b6d4' : '#64748b'}
                />
              </div>
            )}

            {/* Ingestion Mode 2: Audio File Upload */}
            {ingestionTab === 'UPLOAD' && (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center space-y-4 bg-slate-950/40">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.flac,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                  <FileAudio className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-slate-200 uppercase">
                    Upload Recorded Audio for Forensic Telemetry
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Supports WAV, MP3, FLAC, and M4A. Audio is standardized to 16kHz mono and evaluated against ML pipelines.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-semibold uppercase rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>{uploadLoading ? 'Evaluating Forensic Audio...' : 'Select Audio File'}</span>
                </button>
              </div>
            )}

            {/* Ingestion Mode 3: 2-Device Simulator */}
            {ingestionTab === 'REMOTE' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>Remote Smartphone / Second Device Audio Injection</span>
                    </span>
                    <span className="text-cyan-400">{participantsCount} Device(s) Connected</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Evaluators can scan the QR code or open the link on any phone or laptop on the local Wi-Fi to speak into the session remotely. The main VoiceGuard SOC screen will receive the live biometric telemetry in real-time.
                  </p>
                  <button
                    onClick={() => setIsDeviceModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg transition cursor-pointer font-bold"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open QR Code & LAN Link Modal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Status alerts */}
            {streamError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{streamError}</span>
              </div>
            )}
            {micError && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Microphone: {micError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold font-mono uppercase tracking-wide text-slate-100 m-0 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>Configure Simulated Protected Session</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Ingestion Source Type</label>
                <select
                  value={newCallSource}
                  onChange={(e) => setNewCallSource(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-cyan-300 focus:outline-none"
                >
                  <option value="COMMUNICATION_SANDBOX">COMMUNICATION_SANDBOX (Controlled Simulator)</option>
                  <option value="MICROPHONE">MICROPHONE (Local Browser Capture)</option>
                  <option value="AUDIO_UPLOAD">AUDIO_UPLOAD (Forensic File Replay)</option>
                  <option value="EXTERNAL_INTEGRATION">EXTERNAL_INTEGRATION (PBX / SIP Simulation)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Protected Action Category</label>
                <select
                  value={newCallAction}
                  onChange={(e) => setNewCallAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                >
                  <option value="WIRE_TRANSFER">Financial Action — Wire Transfer / Payment</option>
                  <option value="PASSWORD_RESET">Credential Reset — Executive / Admin Password</option>
                  <option value="EXECUTIVE_AUTHORIZATION">Executive Directive — Emergency Sign-off</option>
                  <option value="SYSTEM_ACCESS">Privileged Access — Database / Cloud Console</option>
                  <option value="CONFIDENTIAL_DATA_REQUEST">Data Disclosure — Trade Secrets / Customer Data</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Action Sensitivity</label>
                  <select
                    value={newCallSensitivity}
                    onChange={(e) => setNewCallSensitivity(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Exposure Value (INR ₹)</label>
                  <input
                    type="number"
                    value={newCallAmount}
                    onChange={(e) => setNewCallAmount(e.target.value)}
                    placeholder="250000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Claimed Identity Identifier</label>
                <input
                  type="text"
                  value={newCallIdentity}
                  onChange={(e) => setNewCallIdentity(e.target.value)}
                  placeholder="SPK-CEO-001"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enrolled speaker profile against which biometric voice vectors will be matched.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCall}
                disabled={creatingCall}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase cursor-pointer"
              >
                {creatingCall ? 'Creating...' : 'Initialize Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Device Connection Modal */}
      {selectedCallId && (
        <ConnectDeviceModal
          callId={selectedCallId}
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          lanIp="192.168.1.34"
        />
      )}
    </div>
  );
};
