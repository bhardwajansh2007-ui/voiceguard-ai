import React from 'react';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, score, size = 'md' }) => {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const styles = {
    LOW: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400 shadow-emerald-400/50',
    },
    MEDIUM: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400 shadow-amber-400/50',
    },
    HIGH: {
      bg: 'bg-orange-950/40',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      dot: 'bg-orange-400 shadow-orange-400/50',
    },
    CRITICAL: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
      dot: 'bg-rose-400 shadow-rose-400/50',
    },
  }[normalizedLevel] || {
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-300',
    dot: 'bg-slate-400',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold tracking-wider uppercase rounded-md border ${styles.bg} ${styles.border} ${styles.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot} shadow-sm`} />
      <span>{normalizedLevel}</span>
      {score !== undefined && score !== null && (
        <span className="opacity-80 font-normal">({score.toFixed(1)})</span>
      )}
    </span>
  );
};
