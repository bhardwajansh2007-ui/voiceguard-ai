import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

interface PrototypeDisclaimerProps {
  compact?: boolean;
  className?: string;
}

export const PrototypeDisclaimer: React.FC<PrototypeDisclaimerProps> = ({
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[11px] font-mono text-amber-300/80 ${className}`}
      >
        <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span>
          <strong>Prototype Notice:</strong> Controlled cybersecurity research environment. Workflows simulated for evaluation.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1.5 ${className}`}
    >
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
        <ShieldAlert className="w-4 h-4" />
        <span>Cybersecurity Prototype Notice & Architecture Scope</span>
      </div>
      <p className="leading-relaxed text-slate-400 text-[11px]">
        VoiceGuard AI operates as an autonomous cybersecurity defense and telemetry layer. Communication sessions and protected actions are controlled and simulated within this environment for research, demonstration, and enterprise evaluation. Production deployment interfacing with enterprise PBX, telecom carriers, core banking, or government infrastructure requires organization-specific compliance, authorization, and security review.
      </p>
    </div>
  );
};
