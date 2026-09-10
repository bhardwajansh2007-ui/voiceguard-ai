import React, { useState, useEffect } from 'react';
import {
  Network,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  Server,
  Code,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { IntegrationStatusResponse } from '../types';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const IntegrationGateway: React.FC = () => {
  const [statusData, setStatusData] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.integration.getStatus();
      setStatusData(data);
    } catch (err) {
      console.error('Failed to load integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" />
            CONNECTED
          </span>
        );
      case 'SIMULATED':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
            <Clock className="w-3 h-3" />
            SIMULATED
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
            <AlertCircle className="w-3 h-3" />
            NOT CONFIGURED
          </span>
        );
    }
  };

  const samplePayloads = [
    {
      title: 'Initialize Protected Session',
      method: 'POST',
      endpoint: '/api/v1/calls',
      code: `curl -X POST "http://localhost:8000/api/v1/calls" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -d '{
    "call_id": "CALL-WIRE-9082",
    "source_type": "EXTERNAL_INTEGRATION",
    "action_type": "WIRE_TRANSFER",
    "action_sensitivity": "CRITICAL",
    "transaction_amount": 500000.0,
    "claimed_identity": "SPK-CEO-001"
  }'`,
    },
    {
      title: 'Stream Real-Time Audio (WebSocket)',
      method: 'WS',
      endpoint: '/api/v1/stream/{call_id}',
      code: `// Connect to sliding window analysis stream:
const ws = new WebSocket("ws://localhost:8000/api/v1/stream/CALL-WIRE-9082");

// Stream binary Int16 PCM chunks (16,000 Hz, Mono, Little-Endian)
ws.send(int16ArrayBuffer);

// Receive real-time telemetry updates:
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log("Overall Threat Score:", update.overall_risk_score);
  console.log("Policy Decision:", update.recommended_action);
};`,
    },
    {
      title: 'Forensic Audio File Upload',
      method: 'POST',
      endpoint: '/api/v1/calls/{call_id}/audio',
      code: `curl -X POST "http://localhost:8000/api/v1/calls/CALL-WIRE-9082/audio" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@suspicious_recording.wav"`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Integration Gateway & Telemetry Matrix
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              ARCHITECTURE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Communication connectors, audio ingestion gateways, and downstream policy enforcement hooks
          </p>
        </div>

        <button
          onClick={fetchStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 text-xs font-mono rounded-lg border border-slate-800 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Enterprise Disclaimer */}
      <PrototypeDisclaimer />

      {/* Architecture Pipeline Flow Diagram */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>VoiceGuard AI Cybersecurity Layer Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          {/* Stage 1 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 relative">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">STAGE 1</div>
            <div className="text-sm font-bold text-slate-200">Communication Sources</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ingests audio from Communication Sandbox, local microphones, forensic files, or enterprise PBX/SIP trunks.
            </p>
            <div className="pt-2 text-[10px] text-emerald-400">Audio: 16kHz PCM Little-Endian</div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">STAGE 2</div>
            <div className="text-sm font-bold text-slate-200">Preprocessor & VAD</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Energy-based Voice Activity Detection filters silence and maintains sliding 3-second evaluation windows.
            </p>
            <div className="pt-2 text-[10px] text-cyan-400">Sliding Window: 3.0s (1.0s hop)</div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">STAGE 3</div>
            <div className="text-sm font-bold text-slate-200">ML Defense Ensemble</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Concurrent anti-spoof synthetic phase detection (WavLM) and speaker biometric verification (ECAPA-TDNN).
            </p>
            <div className="pt-2 text-[10px] text-purple-400">Confidence Calibration & Fallbacks</div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">STAGE 4</div>
            <div className="text-sm font-bold text-slate-200">Policy Gate Enforcement</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Fuses risk signals with transaction sensitivity to execute autonomous HOLD decisions or step-up authentication.
            </p>
            <div className="pt-2 text-[10px] text-rose-400">HOLD_SENSITIVE_ACTION Trigger</div>
          </div>
        </div>
      </div>

      {/* Connectivity Status Table */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          <span>Source & Downstream Connector Connectivity Matrix</span>
        </h3>

        {statusData ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="pb-3 pr-4">Connector Name</th>
                  <th className="pb-3 pr-4">Channel Type</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {statusData.sources.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-800/20">
                    <td className="py-3 pr-4 font-bold text-slate-200">{src.name}</td>
                    <td className="py-3 pr-4 text-slate-400">{src.type}</td>
                    <td className="py-3 pr-4">{getStatusBadge(src.status)}</td>
                    <td className="py-3 pr-4 text-slate-400">{src.description}</td>
                    <td className="py-3 text-cyan-400 text-[11px]">{src.latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-slate-500 font-mono">
            Loading connectivity status...
          </div>
        )}
      </div>

      {/* Integration Code & Webhooks */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
          <Code className="w-4 h-4 text-cyan-400" />
          <span>Gateway Integration Specs & Webhook Signatures</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {samplePayloads.map((payload, idx) => (
            <div key={idx} className="bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      payload.method === 'POST'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {payload.method}
                  </span>
                  <span className="text-slate-200 font-semibold">{payload.title}</span>
                  <span className="text-slate-500 text-[11px]">{payload.endpoint}</span>
                </div>

                <button
                  onClick={() => handleCopyCode(payload.code, idx)}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Spec</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                <code>{payload.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
