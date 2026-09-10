import React from 'react';
import { LucideIcon, ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = ShieldAlert,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 backdrop-blur-sm">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800/80 text-cyan-400 mb-4 border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 tracking-wide mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition-all duration-200 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
