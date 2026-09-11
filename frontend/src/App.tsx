import React, { useState, useEffect } from 'react';
import { Smartphone, LayoutDashboard, Shield } from 'lucide-react';
import { api } from './services/api';
import { User } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { SecurityOverview } from './pages/SecurityOverview';
import { CallerIntelligence } from './pages/CallerIntelligence';
import { LiveProtection } from './pages/LiveProtection';
import { ProtectedCalls } from './pages/ProtectedCalls';
import { IdentityRegistry } from './pages/IdentityRegistry';
import { RiskCenter } from './pages/RiskCenter';
import { SecurityActions } from './pages/SecurityActions';
import { IntegrationGateway } from './pages/IntegrationGateway';
import { AuditLedger } from './pages/AuditLedger';
import { ModelStatus } from './pages/ModelStatus';
import { SystemHealth } from './pages/SystemHealth';
import { Settings } from './pages/Settings';
import { RemoteCallerTerminal } from './pages/RemoteCallerTerminal';
import { ProtectedPhone } from './pages/ProtectedPhone';
import { ControlledSecurityTest } from './pages/ControlledSecurityTest';
import { MobileNav } from './components/MobileNav';
import { InstallAppPrompt } from './components/InstallAppPrompt';

export function App() {
  const isCallerMode = new URLSearchParams(window.location.search).get('mode') === 'caller';
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('protected-phone');
  const [phoneScenario, setPhoneScenario] = useState<'LEGITIMATE' | 'CLONED_IMPERSONATION' | 'UNKNOWN_CALLER'>('CLONED_IMPERSONATION');
  const [targetCallId, setTargetCallId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('voiceguard_token');
      if (token) {
        try {
          const user = await api.auth.me();
          setCurrentUser(user);
        } catch {
          localStorage.removeItem('voiceguard_token');
          setCurrentUser(null);
        }
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('voiceguard_token');
    setCurrentUser(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center font-mono text-xs text-cyan-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <span>AUTHENTICATING VOICEGUARD ENCLAVE...</span>
        </div>
      </div>
    );
  }

  if (isCallerMode) {
    return <RemoteCallerTerminal onExit={() => { window.location.href = '/'; }} />;
  }

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentTab === 'protected-phone') {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
        {/* Dedicated Phone Client Header */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-3 md:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
                VOICEGUARD <span className="text-cyan-400">MOBILE SECURITY LAYER</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Active Voice Trust Layer · Protects Supported Channels
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => setCurrentTab('overview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Security Control Center →</span>
            </button>
          </div>
        </header>

        {/* Dedicated Phone Environment Canvas */}
        <main className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-grid-pattern">
          <ProtectedPhone
            initialScenario={phoneScenario}
            onNavigateToAuditLedger={() => setCurrentTab('audit-ledger')}
            onNavigateToControlCenter={(tab) => setCurrentTab(tab || 'overview')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 bg-grid-pattern">
          <div className="max-w-7xl mx-auto">
            {/* 1. Overview */}
            {currentTab === 'overview' && (
              <SecurityOverview
                onNavigateToLiveProtection={(callId) => {
                  setTargetCallId(callId);
                  setCurrentTab('live-protection');
                }}
                onNavigateToSandbox={(callId) => {
                  setTargetCallId(callId);
                  setCurrentTab('protected-calls');
                }}
                onNavigateToSpeakers={() => setCurrentTab('identity-registry')}
                onNavigateToAudit={() => setCurrentTab('audit-ledger')}
                onNavigateToDecisions={() => setCurrentTab('security-actions')}
                onNavigateToTest={() => setCurrentTab('controlled-test')}
              />
            )}

            {/* Controlled Security Test Lab */}
            {currentTab === 'controlled-test' && (
              <ControlledSecurityTest
                onNavigateToMobileLayer={(scenario) => {
                  setPhoneScenario(scenario);
                  setCurrentTab('protected-phone');
                }}
                onNavigateToAuditLedger={() => setCurrentTab('audit-ledger')}
                onNavigateToControlCenter={(tab) => setCurrentTab(tab || 'overview')}
              />
            )}

            {/* 2. Caller Intelligence */}
            {currentTab === 'caller-intelligence' && (
              <CallerIntelligence
                onNavigateToLiveProtection={(callId) => {
                  if (callId) setTargetCallId(callId);
                  setCurrentTab('live-protection');
                }}
                onNavigateToActions={() => setCurrentTab('security-actions')}
              />
            )}

            {/* 3. Live Protection */}
            {(currentTab === 'live-protection' || currentTab === 'live-call') && (
              <LiveProtection
                initialCallId={targetCallId}
                onNavigateToSandbox={(callId) => {
                  if (callId) setTargetCallId(callId);
                  setCurrentTab('protected-calls');
                }}
                onNavigateToDecisions={() => setCurrentTab('security-actions')}
              />
            )}

            {/* 4. Protected Calls */}
            {(currentTab === 'protected-calls' || currentTab === 'sandbox') && (
              <ProtectedCalls
                initialCallId={targetCallId}
                onNavigateToLiveProtection={(callId) => {
                  if (callId) setTargetCallId(callId);
                  setCurrentTab('live-protection');
                }}
              />
            )}

            {/* 5. Identity Registry */}
            {(currentTab === 'identity-registry' || currentTab === 'speakers') && (
              <IdentityRegistry />
            )}

            {/* 6. Risk Center */}
            {(currentTab === 'risk-center' || currentTab === 'risk' || currentTab === 'investigation') && (
              <RiskCenter />
            )}

            {/* 7. Security Actions */}
            {(currentTab === 'security-actions' || currentTab === 'actions' || currentTab === 'decisions') && (
              <SecurityActions />
            )}

            {/* 8. Audit Ledger */}
            {(currentTab === 'audit-ledger' || currentTab === 'audit') && (
              <AuditLedger />
            )}

            {/* 9. Models */}
            {currentTab === 'models' && <ModelStatus />}

            {/* 10. Integration API */}
            {currentTab === 'integration' && <IntegrationGateway />}

            {/* 11. System */}
            {(currentTab === 'system' || currentTab === 'health') && <SystemHealth />}

            {/* Extra: Settings */}
            {currentTab === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* PWA Phone Install Prompt */}
      <InstallAppPrompt />
    </div>
  );
}

export default App;
