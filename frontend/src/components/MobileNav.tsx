import React, { useState } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  Activity,
  Terminal,
  Grid,
  X,
  Users,
  Search,
  ShieldAlert,
  Network,
  Database,
  Cpu,
  HeartPulse,
  Sliders,
  PhoneCall,
  LogOut,
  User,
} from 'lucide-react';
import { User as UserType } from '../types';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  user: UserType | null;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs = [
    { id: 'protected-phone', label: 'Protected Phone', icon: Smartphone, dot: true },
    { id: 'caller-intelligence', label: 'Caller Intel', icon: PhoneCall },
    { id: 'live-protection', label: 'Live Signal', icon: Activity },
    { id: 'overview', label: 'Control Center', icon: LayoutDashboard },
  ];

  const drawerItems = [
    { id: 'protected-calls', label: 'Protected Calls', icon: Terminal },
    { id: 'identity-registry', label: 'Identity Registry', icon: Users },
    { id: 'risk-center', label: 'Risk Center', icon: Search },
    { id: 'security-actions', label: 'Security Actions', icon: ShieldAlert },
    { id: 'audit-ledger', label: 'Audit Ledger', icon: Database },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'integration', label: 'Integration API', icon: Network },
    { id: 'system', label: 'System', icon: Sliders },
  ];

  const handleSelectDrawerItem = (tabId: string) => {
    onSelectTab(tabId);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Bottom Sticky Mobile Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1 flex items-center justify-around font-mono text-[10px]">
        {mainTabs.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setDrawerOpen(false);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 mb-0.5" />
                {item.dot && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </div>
              <span className="tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* 4th Tab: More / Drawer Menu */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all cursor-pointer ${
            drawerOpen || !['overview', 'live-protection', 'sandbox'].includes(currentTab)
              ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Grid className="w-5 h-5 mb-0.5" />
          <span className="tracking-tight">More</span>
        </button>
      </nav>

      {/* Slide-Up / Slide-Over Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#0b0f19] border-t border-cyan-500/30 rounded-t-2xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase text-slate-100">
                  VoiceGuard Security Modules
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Switch to Caller Terminal */}
            <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-950 rounded-lg text-cyan-400 border border-cyan-500/40">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-cyan-300">Remote Caller Mode</div>
                  <div className="text-[10px] text-slate-400">Stream speech from phone</div>
                </div>
              </div>
              <button
                onClick={() => { window.location.href = '/?mode=caller'; }}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase text-[10px] rounded cursor-pointer"
              >
                Switch
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {drawerItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectDrawerItem(item.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Session & Logout */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">{user?.username}</div>
                  <div className="text-[9px] text-cyan-400">{user?.role}</div>
                </div>
              </div>

              <button
                onClick={() => {
                  setDrawerOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/30 text-[10px] uppercase font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
