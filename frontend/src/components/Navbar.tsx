import React from 'react';
import { Shield, Radio, LogOut, User, Cpu } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
  activeCallsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, activeCallsCount = 0 }) => {
  return (
    <header className="h-14 md:h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-3 md:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand Title */}
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-md shadow-cyan-500/10 shrink-0">
          <Shield className="w-4 h-4 md:w-6 md:h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold tracking-wider text-slate-100 uppercase m-0 p-0 font-mono">
              VOICEGUARD <span className="text-cyan-400">AI</span>
            </h1>
          </div>
          <p className="text-[10px] md:text-[11px] text-slate-400 m-0 p-0 truncate max-w-[180px] sm:max-w-none">
            Voice Integrity & Defense
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          <Radio className={`w-3.5 h-3.5 ${activeCallsCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Active Sessions: <strong>{activeCallsCount}</strong></span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mode: <strong className="text-cyan-300">Safe Deployment</strong></span>
        </div>
      </div>

      {/* User Operator Info & Action */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user.username}</div>
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{user.role}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <button
              onClick={onLogout}
              title="Sign out of Security Console"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-400">UNAUTHENTICATED</div>
        )}
      </div>
    </header>
  );
};
