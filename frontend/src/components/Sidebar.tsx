import {
  Shield,
  Smartphone,
  LayoutDashboard,
  UserCheck,
  Activity,
  ShieldCheck,
  Users,
  Search,
  ShieldAlert,
  Database,
  Cpu,
  Network,
  Sliders,
  TestTube,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const phoneItems = [
    { id: 'protected-phone', label: 'Mobile Security Layer', icon: Shield, badge: 'ACTIVE LAYER' },
    { id: 'live-protection', label: 'Live Signal Defense', icon: Activity, badge: 'STREAM' },
  ];

  const controlCenterItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'controlled-test', label: 'Controlled Security Test', icon: TestTube, badge: 'TEST LAB' },
    { id: 'caller-intelligence', label: 'Caller Intelligence', icon: UserCheck },
    { id: 'protected-calls', label: 'Protected Calls', icon: ShieldCheck },
    { id: 'identity-registry', label: 'Identity Registry', icon: Users },
    { id: 'risk-center', label: 'Risk Center', icon: Search },
    { id: 'security-actions', label: 'Security Actions', icon: ShieldAlert },
    { id: 'audit-ledger', label: 'Audit Ledger', icon: Database },
    { id: 'models', label: 'Models', icon: Cpu },
    { id: 'integration', label: 'Integration API', icon: Network },
    { id: 'system', label: 'System', icon: Sliders },
  ];

  return (
    <aside className="hidden md:flex w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 flex-col justify-between shrink-0">
      <div className="space-y-5">
        {/* Group 1: Communication Security Layer */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-3 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>SECURITY LAYER INTEGRATION</span>
          </div>
          <nav className="space-y-1">
            {phoneItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 uppercase">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Group 2: Security Control Center */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 px-3 mb-2">
            SECURITY CONTROL CENTER
          </div>
          <nav className="space-y-1 max-h-[48vh] overflow-y-auto pr-1">
            {controlCenterItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800/60">
        <div className="rounded-lg bg-slate-900/40 p-3 border border-slate-800/40 text-[11px] font-mono text-slate-400 space-y-1.5">
          <div className="flex justify-between">
            <span>DEFENSE LAYER</span>
            <span className="text-emerald-400 font-semibold">ACTIVE</span>
          </div>
          <div className="flex justify-between">
            <span>TAMPER PROOF</span>
            <span className="text-cyan-400">SHA-256</span>
          </div>
          <div className="flex justify-between">
            <span>BIOMETRIC</span>
            <span className="text-slate-300">CONSENTED</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
