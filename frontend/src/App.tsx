import React, { useState, useEffect } from 'react';
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
import { MobileNav } from './components/MobileNav';
import { InstallAppPrompt } from './components/InstallAppPrompt';

export function App() {
  const isCallerMode = new URLSearchParams(window.location.search).get('mode') === 'caller';
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('overview');
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

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col">
      <Navbar user={currentUser} onLogout={handleLogout} />

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
