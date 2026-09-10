import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserType, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SECURITY_ANALYST');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await api.auth.register({
          username,
          email,
          password,
          role,
        });
      }

      // Login to obtain JWT
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const authData = await api.auth.login(formData);
      localStorage.setItem('voiceguard_token', authData.access_token);

      // Fetch user profile
      const userProfile = await api.auth.me();
      onLoginSuccess(userProfile, authData.access_token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] bg-grid-pattern flex flex-col justify-center items-center px-4 relative">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-slate-100 uppercase">
            VOICEGUARD <span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Real-Time Voice Integrity & Impersonation Defense Platform
          </p>
          <div className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-cyan-400 border border-slate-700">
            AICTE CYBER SECURITY CELL
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Operator Identifier
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors font-mono"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Official Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@voiceguard.internal"
                className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Passphrase
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60 transition-colors font-mono"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-colors font-mono"
              >
                <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
                <option value="AUTHORIZED_OPERATOR">AUTHORIZED_OPERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Register Analyst Account' : 'Authenticate Operator'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline underline-offset-4 cursor-pointer"
          >
            {isRegister ? 'Switch to Operator Login' : 'Register New Security Analyst'}
          </button>
        </div>
      </div>
    </div>
  );
};
