import React, { useState, useEffect } from 'react';
import { HeartPulse, CheckCircle2, AlertCircle, RefreshCw, Server, Database, Radio, Cpu } from 'lucide-react';
import { api } from '../services/api';
import { SystemHealth as SystemHealthType } from '../types';

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await api.health.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
            System Telemetry & Component Health
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live operational status across database engine, inference adapters, WebSocket streams, and cryptographic audit ledger.
          </p>
        </div>

        <button
          onClick={loadHealth}
          className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {!health ? (
        <div className="text-center py-12 text-slate-500 font-mono text-xs">
          Querying platform telemetry probes...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Health Status Overview */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">PLATFORM STATUS</span>
              <span
                className={`text-lg font-bold ${
                  health.status === 'HEALTHY'
                    ? 'text-emerald-400'
                    : health.status === 'DEGRADED'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {health.status}
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] block">DEPLOYMENT ENVIRONMENT</span>
              <span className="text-slate-200 font-bold text-sm uppercase">
                {health.environment} ({health.deployment_mode})
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] block">SYSTEM UPTIME</span>
              <span className="text-cyan-400 font-bold text-sm">
                {health.uptime_seconds.toFixed(0)} seconds
              </span>
            </div>

            <div>
              <span className="text-slate-500 uppercase text-[10px] block">TELEMETRY TIMESTAMP</span>
              <span className="text-slate-400 font-mono text-xs">
                {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Component Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(health.components).map(([name, comp]) => {
              const icons: Record<string, any> = {
                database: Database,
                ml_inference: Cpu,
                audit_ledger: Server,
                websocket_gateway: Radio,
              };
              const Icon = icons[name] || Server;

              const isOp = comp.status === 'OPERATIONAL';
              const isDeg = comp.status === 'DEGRADED';

              return (
                <div
                  key={name}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 font-mono text-xs space-y-2 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-slate-200 uppercase">{name.replace('_', ' ')}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isOp
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : isDeg
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {comp.status}
                    </span>
                  </div>

                  <p className="text-slate-400 font-sans text-xs">{comp.message}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-500">
                    <span>Response Latency:</span>
                    <span className="text-slate-300 font-bold">
                      {comp.latency_ms !== null && comp.latency_ms !== undefined
                        ? `${comp.latency_ms} ms`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
