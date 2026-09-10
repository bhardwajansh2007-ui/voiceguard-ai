import React from 'react';
import { ShieldCheck, UserCheck, Activity, PhoneCall, DollarSign } from 'lucide-react';

interface SignalBreakdownCardProps {
  signals?: Record<string, number>;
  weights?: Record<string, number>;
  antiSpoofStatus?: string;
  speakerStatus?: string;
}

export const SignalBreakdownCard: React.FC<SignalBreakdownCardProps> = ({
  signals = {},
  weights = {},
  antiSpoofStatus,
  speakerStatus,
}) => {
  const signalConfigs = [
    {
      id: 'spoof_signal',
      name: 'Voice Authenticity (Anti-Spoof)',
      icon: ShieldCheck,
      value: signals.spoof_signal !== undefined ? signals.spoof_signal : null,
      weightKey: 'weight_spoof',
      statusText: antiSpoofStatus || 'UNANALYZED',
      description: 'Probability of synthetic/cloned speech',
    },
    {
      id: 'speaker_mismatch_signal',
      name: 'Speaker Verification',
      icon: UserCheck,
      value: signals.speaker_mismatch_signal !== undefined ? signals.speaker_mismatch_signal : null,
      weightKey: 'weight_speaker_mismatch',
      statusText: speakerStatus || 'UNVERIFIED',
      description: 'Acoustic mismatch with claimed speaker profile',
    },
    {
      id: 'behavioral_signal',
      name: 'Behavioral & Prosodic Dynamics',
      icon: Activity,
      value: signals.behavioral_signal !== undefined ? signals.behavioral_signal : null,
      weightKey: 'weight_behavioral',
      statusText: signals.behavioral_signal ? `${(signals.behavioral_signal * 100).toFixed(0)}% ANOMALY` : 'NORMAL',
      description: 'Speech jitter, shimmer, hesitation and unnatural cadence',
    },
    {
      id: 'caller_context_signal',
      name: 'Caller Identity & Channel Context',
      icon: PhoneCall,
      value: signals.caller_context_signal !== undefined ? signals.caller_context_signal : null,
      weightKey: 'weight_caller_context',
      statusText: signals.caller_context_signal ? `${(signals.caller_context_signal * 100).toFixed(0)}% RISK` : 'BASELINE',
      description: 'Caller ID integrity, origin, and authentication state',
    },
    {
      id: 'transaction_sensitivity_signal',
      name: 'Transaction / Action Impact',
      icon: DollarSign,
      value: signals.transaction_sensitivity_signal !== undefined ? signals.transaction_sensitivity_signal : null,
      weightKey: 'weight_transaction_sensitivity',
      statusText: signals.transaction_sensitivity_signal ? `${(signals.transaction_sensitivity_signal * 100).toFixed(0)}% SENSITIVITY` : 'LOW',
      description: 'Sensitivity level and monetary value of requested action',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Multi-Signal Defense Matrix
          </h4>
          <p className="text-xs text-slate-400">
            Real-time decomposed security dimensions & dynamically calibrated fusion weights
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
          5 SIGNALS ACTIVE
        </span>
      </div>

      <div className="space-y-4">
        {signalConfigs.map((sig) => {
          const Icon = sig.icon;
          const val = sig.value;
          const weight = weights[sig.weightKey];
          const percent = val !== null ? Math.round(val * 100) : 0;

          // Color scale
          let barColor = 'bg-slate-700';
          let textColor = 'text-slate-400';
          if (val !== null) {
            if (percent > 65) {
              barColor = 'bg-rose-500 shadow-rose-500/30';
              textColor = 'text-rose-400';
            } else if (percent > 35) {
              barColor = 'bg-amber-500 shadow-amber-500/30';
              textColor = 'text-amber-400';
            } else {
              barColor = 'bg-emerald-500 shadow-emerald-500/30';
              textColor = 'text-emerald-400';
            }
          }

          return (
            <div key={sig.id} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/50">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium text-slate-300">{sig.name}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  {weight !== undefined && (
                    <span className="text-slate-400">
                      Weight: <strong className="text-slate-300">{(weight * 100).toFixed(0)}%</strong>
                    </span>
                  )}
                  <span className={`font-semibold ${textColor}`}>
                    {val !== null ? `${percent}%` : 'NO DATA'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${barColor}`}
                  style={{ width: val !== null ? `${Math.max(4, percent)}%` : '0%' }}
                />
              </div>

              <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                <span>{sig.description}</span>
                <span className="font-mono text-slate-400">{sig.statusText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
