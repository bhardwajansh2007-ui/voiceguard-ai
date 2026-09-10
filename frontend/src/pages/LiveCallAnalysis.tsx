import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Radio,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  PhoneCall,
  Volume2,
  FileAudio,
  Smartphone,
  Plus,
  Users,
  Activity,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { CallSession, CallDetailResponse, StreamingAnalysisUpdate, BufferStatusUpdate } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { RiskBadge } from '../components/RiskBadge';
import { SignalBreakdownCard } from '../components/SignalBreakdownCard';
import { EmptyState } from '../components/EmptyState';
import { ConnectDeviceModal } from '../components/ConnectDeviceModal';

interface LiveCallAnalysisProps {
  initialCallId?: string;
  onNavigateToDecisions: () => void;
}

export const LiveCallAnalysis: React.FC<LiveCallAnalysisProps> = ({
  initialCallId,
  onNavigateToDecisions,
}) => {
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string>(initialCallId || '');
  const [callDetail, setCallDetail] = useState<CallDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Live WebSocket Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamClient, setStreamClient] = useState<VoiceStreamClient | null>(null);
  const streamClientRef = useRef<VoiceStreamClient | null>(null);
  const [liveAnalysis, setLiveAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Modals
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCallAction, setNewCallAction] = useState('WIRE_TRANSFER');
  const [newCallSensitivity, setNewCallSensitivity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');
  const [newCallAmount, setNewCallAmount] = useState('');
  const [newCallIdentity, setNewCallIdentity] = useState('');
  const [creatingCall, setCreatingCall] = useState(false);

  // Audio upload state
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio recorder hook callback using ref to avoid stale closure drops
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

  // Load available calls
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

  // Load specific call details
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
    if (selectedCallId) {
      loadCallDetail(selectedCallId);
      setLiveAnalysis(null);
      setBufferStatus(null);
      setStreamError(null);
    }
  }, [selectedCallId]);

  // Start WebSocket Live Stream
  const handleStartStream = async () => {
    if (!selectedCallId) return;
    setStreamError(null);

    const client = new VoiceStreamClient(
      selectedCallId,
      (update) => {
        setLiveAnalysis(update);
        if (update.recommended_action === 'HOLD_SENSITIVE_ACTION') {
          // Re-fetch call detail to update status badge
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
      setStreamError(err.message || 'Failed to create call session');
    } finally {
      setCreatingCall(false);
    }
  };

  // Handle Audio File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCallId) return;

    setUploadLoading(true);
    setUploadSuccess(null);
    setStreamError(null);

    try {
      const result = await api.calls.uploadAudio(selectedCallId, file);
      setUploadSuccess(`Analysis completed successfully for ${file.name}.`);
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

  // Active risk data: prioritize live WebSocket stream if active, else database record
  const currentRisk = liveAnalysis
    ? {
        overall_risk_score: liveAnalysis.overall_risk_score,
        risk_level: liveAnalysis.risk_level,
        contributing_factors: liveAnalysis.contributing_factors,
        signals: liveAnalysis.signals,
      }
    : callDetail?.latest_risk
    ? {
        overall_risk_score: callDetail.latest_risk.overall_risk_score,
        risk_level: callDetail.latest_risk.risk_level,
        contributing_factors: callDetail.latest_risk.contributing_factors,
        signals: callDetail.latest_risk.signal_values,
      }
    : null;

  const currentDecision = liveAnalysis
    ? {
        decision: liveAnalysis.recommended_action,
        reason: liveAnalysis.decision_reason || 'Real-time sliding window evaluation',
        required_action: liveAnalysis.required_action || 'INDEPENDENT_VERIFICATION',
      }
    : callDetail?.latest_decision
    ? {
        decision: callDetail.latest_decision.decision,
        reason: callDetail.latest_decision.reason,
        required_action: callDetail.latest_decision.required_action,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0 flex items-center gap-2">
            <span>Live Call Integrity Monitor</span>
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                STREAMING
              </span>
            )}
            {participantsCount > 1 && (
              <span className="flex items-center gap-1 text-xs text-cyan-400 font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30">
                <Users className="w-3 h-3" />
                <span>{participantsCount} DEVICES CONNECTED</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time biometric voice verification, anti-spoof acoustic inference, and transaction hold execution
          </p>
        </div>

        {/* Action Buttons & Session Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Create New Call Quick Action */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Call</span>
          </button>

          {/* Connect Second Device / Phone */}
          {selectedCallId && (
            <button
              onClick={() => setIsDeviceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-mono rounded-lg border border-cyan-500/40 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Connect Phone / 2nd Device</span>
            </button>
          )}

          {/* Session Selector */}
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

      {calls.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-slate-200 uppercase">No Active Call Sessions</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Initialize a monitored call session to begin live voice stream inspection or connect a remote mobile phone.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold font-mono text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Monitored Call Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Live Controls, Waveform, and Signal Matrix */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Context Banner */}
            {callDetail && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">CALL IDENTIFIER</span>
                  <span className="font-mono text-sm font-bold text-cyan-400">{callDetail.call_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">CALLER CONTEXT</span>
                  <span className="font-mono text-slate-200">{callDetail.caller_id || 'Anonymous / Masked'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">CLAIMED SPEAKER</span>
                  <span className="font-mono text-slate-200">
                    {callDetail.claimed_identity ? (
                      <span className="text-cyan-400">{callDetail.claimed_identity}</span>
                    ) : (
                      'None (Unclaimed)'
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">REQUESTED ACTION</span>
                  <span className="font-mono text-slate-200">{callDetail.action_type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">TRANSACTION VALUE</span>
                  <span className="font-mono text-slate-200">
                    {callDetail.transaction_amount ? `₹${callDetail.transaction_amount.toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">SESSION STATUS</span>
                  <span
                    className={`font-mono px-2 py-0.5 rounded font-bold ${
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

            {/* Ingestion Gateway: Live Mic vs Upload vs 2nd Device */}
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                    Audio Ingestion Gateway
                  </h3>
                  <p className="text-xs text-slate-400">
                    Stream local mic, connect remote phone, or upload recorded audio
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* File Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".wav,.mp3,.flac,.m4a"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStreaming || uploadLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold uppercase rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{uploadLoading ? 'Processing...' : 'Upload Audio'}</span>
                  </button>

                  {/* Connect 2nd Device / Phone Quick Button */}
                  <button
                    onClick={() => setIsDeviceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 text-xs font-semibold uppercase rounded-lg border border-cyan-500/30 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>2nd Device</span>
                  </button>

                  {/* Microphone Toggle Button */}
                  {!isStreaming ? (
                    <button
                      onClick={handleStartStream}
                      disabled={uploadLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Live Stream</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopStream}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-amber-600/30 transition-all cursor-pointer animate-pulse"
                    >
                      <MicOff className="w-4 h-4" />
                      <span>Stop Live Stream</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time Streaming Buffer Feedback */}
              {isStreaming && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Sliding Analysis Window:</span>
                    </span>
                    <span className="text-cyan-400">
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
                    <span>Window: {bufferStatus ? `${bufferStatus.progress_pct}% full` : 'Listening'}</span>
                  </div>
                </div>
              )}

              {/* Feedback Banners */}
              {streamError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{streamError}</span>
                </div>
              )}
              {micError && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Microphone: {micError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Real Web Audio API Waveform Visualizer */}
              <WaveformVisualizer
                analyserNode={analyserNode}
                isActive={isRecording}
                color={
                  currentRisk?.risk_level === 'CRITICAL' || currentRisk?.risk_level === 'HIGH'
                    ? '#f43f5e'
                    : '#06b6d4'
                }
              />
            </div>

            {/* Multi-Signal Matrix */}
            <SignalBreakdownCard
              signals={currentRisk?.signals}
              weights={callDetail?.latest_risk?.weights_used}
              antiSpoofStatus={
                liveAnalysis?.voice_authenticity.status ||
                callDetail?.latest_analysis?.anti_spoof_status
              }
              speakerStatus={
                liveAnalysis?.speaker_verification.status ||
                callDetail?.latest_analysis?.speaker_verification_status
              }
            />
          </div>

          {/* Right Column: Risk Score, Security Decision, Action Controls */}
          <div className="space-y-6">
            {/* Overall Risk Score Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Impersonation Threat Score
                </h3>
                {currentRisk ? (
                  <RiskBadge level={currentRisk.risk_level} score={currentRisk.overall_risk_score} />
                ) : (
                  <span className="text-xs font-mono text-slate-500">NO ANALYSIS</span>
                )}
              </div>

              {currentRisk ? (
                <div className="text-center py-4">
                  <div className="text-5xl font-black font-mono tracking-tight text-slate-100">
                    {currentRisk.overall_risk_score.toFixed(1)}
                    <span className="text-xl text-slate-500 font-normal"> / 100</span>
                  </div>
                  <div className="text-xs font-mono uppercase mt-2 text-slate-400">
                    Evaluated Threat Level: <strong className="text-cyan-400">{currentRisk.risk_level}</strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  No analysis available. Stream audio or upload a recording to compute real risk.
                </div>
              )}

              {/* Explainability Contributing Factors */}
              {currentRisk?.contributing_factors && currentRisk.contributing_factors.length > 0 && (
                <div className="pt-3 border-t border-slate-800/60">
                  <span className="text-[11px] font-mono uppercase text-slate-400 block mb-2">
                    Contributing Risk Signals:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentRisk.contributing_factors.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Enforced Security Decision */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Security Policy Decision
                </h3>
                <Lock className="w-4 h-4 text-cyan-400" />
              </div>

              {currentDecision ? (
                <div className="space-y-3">
                  <div
                    className={`p-3 rounded-lg border font-mono text-xs font-semibold flex items-center gap-2.5 ${
                      currentDecision.decision === 'HOLD_SENSITIVE_ACTION'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                        : currentDecision.decision === 'STRONG_VERIFICATION'
                        ? 'bg-orange-950/60 text-orange-300 border-orange-500/40'
                        : currentDecision.decision === 'ADDITIONAL_VERIFICATION'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>DECISION: {currentDecision.decision}</span>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1">
                    <div>
                      <strong className="text-slate-300">Policy Reason:</strong> {currentDecision.reason}
                    </div>
                    <div>
                      <strong className="text-slate-300">Mandated Action:</strong>{' '}
                      <span className="font-mono text-cyan-400">{currentDecision.required_action}</span>
                    </div>
                  </div>

                  {/* Prevention Action Button */}
                  {callDetail?.status === 'HOLD' && (
                    <button
                      onClick={onNavigateToDecisions}
                      className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Review & Release Hold</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-mono text-center py-4">
                  Awaiting acoustic inference to evaluate policy rules.
                </div>
              )}
            </div>

            {/* Extracted Acoustic Telemetry */}
            {callDetail?.latest_analysis?.features && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 font-mono text-[11px] space-y-2">
                <span className="text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-1">
                  Physical Acoustic Telemetry
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="text-slate-200">{callDetail.latest_analysis.features.duration_seconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VAD Speech Ratio:</span>
                  <span className="text-slate-200">
                    {(callDetail.latest_analysis.features.vad_speech_ratio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pitch (F0):</span>
                  <span className="text-slate-200">{callDetail.latest_analysis.features.fundamental_frequency_f0} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Spectral Centroid:</span>
                  <span className="text-slate-200">{callDetail.latest_analysis.features.spectral_centroid} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pitch Jitter:</span>
                  <span className="text-slate-200">{callDetail.latest_analysis.features.jitter_local}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amplitude Shimmer:</span>
                  <span className="text-slate-200">{callDetail.latest_analysis.features.shimmer_local}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2nd Device Connection Modal */}
      <ConnectDeviceModal
        callId={selectedCallId}
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      {/* Quick Call Session Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold font-mono uppercase text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Initialize Monitored Call Session</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">ACTION TYPE</label>
                <select
                  value={newCallAction}
                  onChange={(e) => setNewCallAction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="WIRE_TRANSFER">WIRE_TRANSFER (Financial)</option>
                  <option value="CREDENTIAL_RESET">CREDENTIAL_RESET (Identity)</option>
                  <option value="SYSTEM_ACCESS">SYSTEM_ACCESS (Privileged)</option>
                  <option value="EXECUTIVE_DIRECTIVE">EXECUTIVE_DIRECTIVE (High-Impact)</option>
                  <option value="GENERAL_INQUIRY">GENERAL_INQUIRY (Low-Risk)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">RISK SENSITIVITY</label>
                <select
                  value={newCallSensitivity}
                  onChange={(e) => setNewCallSensitivity(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="CRITICAL">CRITICAL (Zero-Tolerance Threshold)</option>
                  <option value="HIGH">HIGH (Strong Verification Required)</option>
                  <option value="MEDIUM">MEDIUM (Standard Policy)</option>
                  <option value="LOW">LOW (Informational Only)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CLAIMED IDENTITY (Optional)</label>
                <input
                  type="text"
                  value={newCallIdentity}
                  onChange={(e) => setNewCallIdentity(e.target.value)}
                  placeholder="e.g. SPK-CEO-001"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">TRANSACTION AMOUNT (₹)</label>
                <input
                  type="number"
                  value={newCallAmount}
                  onChange={(e) => setNewCallAmount(e.target.value)}
                  placeholder="250000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCall}
                disabled={creatingCall}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono rounded-lg shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {creatingCall ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
