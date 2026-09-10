import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Shield,
  ShieldAlert,
  Radio,
  Volume2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { VoiceStreamClient } from '../services/websocket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { StreamingAnalysisUpdate, BufferStatusUpdate } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { api } from '../services/api';

interface RemoteCallerTerminalProps {
  initialCallId?: string;
  onExit?: () => void;
}

export const RemoteCallerTerminal: React.FC<RemoteCallerTerminalProps> = ({
  initialCallId,
  onExit,
}) => {
  // Extract call_id from URL query if present
  const queryParams = new URLSearchParams(window.location.search);
  const paramCallId = queryParams.get('call_id') || initialCallId || '';

  const [callId, setCallId] = useState<string>(paramCallId);
  const [callDetails, setCallDetails] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [streamClient, setStreamClient] = useState<VoiceStreamClient | null>(null);
  const streamClientRef = useRef<VoiceStreamClient | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<string>('Standby');
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [bufferStatus, setBufferStatus] = useState<BufferStatusUpdate | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<StreamingAnalysisUpdate | null>(null);
  const [packetsSent, setPacketsSent] = useState<number>(0);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio chunk callback using ref to prevent closure staleness
  const handleAudioChunk = useCallback((chunk: Int16Array) => {
    if (streamClientRef.current) {
      streamClientRef.current.sendAudioChunk(chunk);
      setPacketsSent((prev) => prev + 1);
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

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  // Load call details if available
  useEffect(() => {
    if (callId) {
      api.calls
        .get(callId)
        .then((data) => setCallDetails(data))
        .catch(() => {
          // If session doesn't exist yet, we can create it on demand
        });
    }
  }, [callId]);

  const handleStartCall = async () => {
    if (!callId.trim()) {
      setErrorMsg('Please specify a valid Call Session ID');
      return;
    }
    setErrorMsg(null);
    setConnectionStatus('Connecting...');

    const client = new VoiceStreamClient(
      callId.trim(),
      (update) => {
        setLatestAnalysis(update);
      },
      (err) => {
        setErrorMsg(err);
        handleEndCall();
      },
      () => {
        setConnectionStatus('Secure Voice Channel Connected');
        setIsCalling(true);
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

  const handleEndCall = () => {
    if (streamClientRef.current) {
      streamClientRef.current.stop();
      streamClientRef.current.disconnect();
      streamClientRef.current = null;
      setStreamClient(null);
    }
    stopRecording();
    setIsCalling(false);
    setConnectionStatus('Call Ended');
    setBufferStatus(null);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
              VoiceGuard <span className="text-cyan-400 font-normal">Remote Caller</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 hidden sm:inline">DEFENSE GATEWAY:</span>
          <span className="text-emerald-400 font-semibold">ACTIVE</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full space-y-5">
        {/* Session Card */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
            <span>SESSION IDENTIFIER</span>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Users className="w-3.5 h-3.5" />
              <span>{participantsCount} in Call</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              disabled={isCalling}
              placeholder="e.g. CALL-TRANSFER-01"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 disabled:opacity-70"
            />
            {callDetails && (
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {callDetails.action_type || 'TRANSACTION'}
              </span>
            )}
          </div>

          {callDetails?.claimed_identity && (
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Claimed Identity:</span>
              <span className="text-slate-200 font-semibold">{callDetails.claimed_identity}</span>
            </div>
          )}
        </div>

        {/* Live Audio Visualizer */}
        <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Acoustic Waveform</span>
            </span>
            <span>{formatSeconds(callDuration)}</span>
          </div>

          <div className="w-full h-24 bg-[#05070c] rounded-lg overflow-hidden flex items-center justify-center border border-slate-800/80">
            <WaveformVisualizer analyserNode={analyserNode} isActive={isCalling} />
          </div>

          {/* Local Microphone Sensitivity Meter */}
          {isCalling && (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>Mic Level</span>
                </span>
                <span>{Math.round(audioLevel * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-red-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round(audioLevel * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Central Call Button */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          {!isCalling ? (
            <button
              onClick={handleStartCall}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 font-bold flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition cursor-pointer border-4 border-emerald-400/30"
            >
              <PhoneCall className="w-8 h-8 mb-1" />
              <span className="text-[11px] font-mono uppercase tracking-wider">Start Call</span>
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white font-bold flex flex-col items-center justify-center shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition cursor-pointer border-4 border-red-400/30 animate-pulse"
            >
              <PhoneOff className="w-8 h-8 mb-1" />
              <span className="text-[11px] font-mono uppercase tracking-wider">Hang Up</span>
            </button>
          )}

          <p className="text-xs font-mono text-center text-slate-400">
            {isCalling ? (
              <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live: Speaking into VoiceGuard Channel
              </span>
            ) : (
              'Tap Start Call to connect your microphone'
            )}
          </p>
        </div>

        {/* Buffer Accumulation & Streaming Feedback */}
        {isCalling && bufferStatus && (
          <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Analysis Window:</span>
              <span className="text-cyan-300">
                {bufferStatus.buffered_seconds}s / {bufferStatus.target_seconds}s
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${bufferStatus.progress_pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
              <span>Packets Sent: {packetsSent}</span>
              <span>Buffer: {bufferStatus.progress_pct}% full</span>
            </div>
          </div>
        )}

        {/* Security Alert Banner (If Policy Decision Triggered) */}
        {latestAnalysis && (
          <div
            className={`w-full p-3 rounded-xl border text-xs font-mono space-y-1 ${
              latestAnalysis.recommended_action === 'HOLD_SENSITIVE_ACTION'
                ? 'bg-red-950/60 border-red-500/40 text-red-200'
                : latestAnalysis.recommended_action === 'ADDITIONAL_VERIFICATION'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold uppercase">
              {latestAnalysis.recommended_action === 'HOLD_SENSITIVE_ACTION' ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Security Notice: Action On Hold</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Voice Integrity Verified</span>
                </>
              )}
            </div>
            <p className="text-[11px] opacity-90">
              {latestAnalysis.decision_reason || 'Biometric security evaluation running'}
            </p>
          </div>
        )}

        {/* Error Notification */}
        {(errorMsg || micError) && (
          <div className="w-full p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-mono flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg || micError}</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-3 text-center text-[10px] font-mono text-slate-500 border-t border-slate-900">
        VOICEGUARD AI DEFENSE PLATFORM &bull; SMART INDIA HACKATHON 2026
      </footer>
    </div>
  );
};
