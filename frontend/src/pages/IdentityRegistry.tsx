import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Upload,
  RefreshCw,
  Building,
  Briefcase,
  Phone,
  Lock,
  KeyRound,
  Shield,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { Speaker, IdentityProfile } from '../types';
import { EmptyState } from '../components/EmptyState';
import { PrototypeDisclaimer } from '../components/PrototypeDisclaimer';

export const IdentityRegistry: React.FC = () => {
  const [speakers, setSpeakers] = useState<IdentityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedSpeakerForEnroll, setSelectedSpeakerForEnroll] = useState<IdentityProfile | null>(null);

  // New Identity Profile Form
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newOrg, setNewOrg] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCallerId, setNewCallerId] = useState('');
  const [newMfa, setNewMfa] = useState(true);
  const [newAllowedOps, setNewAllowedOps] = useState('WIRE_TRANSFER, APPROVAL');
  const [createLoading, setCreateLoading] = useState(false);

  // Biometric Enrollment Form
  const [enrollConsent, setEnrollConsent] = useState(false);
  const [enrollFile, setEnrollFile] = useState<File | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadIdentities = async () => {
    setLoading(true);
    try {
      const data = await api.speakers.list();
      setSpeakers(data);
    } catch (err: any) {
      console.error('Failed to load identity registry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentities();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim()) {
      setError('Identifier and Full Name are required.');
      return;
    }

    setCreateLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const ops = newAllowedOps
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.speakers.create({
        speaker_id: newId.trim(),
        display_name: newName.trim(),
        organization: newOrg.trim() || 'Enterprise Enclave',
        role_title: newRole.trim() || 'Personnel',
        caller_id: newCallerId.trim() || undefined,
        identity_status: 'VERIFIED',
        mfa_enabled: newMfa,
        sensitive_actions_enabled: true,
        risk_threshold: 70,
        allowed_operations: ops,
      });

      setSuccessMsg(`Identity profile "${newName}" successfully registered in Enterprise Enclave.`);
      setShowCreateModal(false);
      setNewId('');
      setNewName('');
      setNewOrg('');
      setNewRole('');
      setNewCallerId('');
      await loadIdentities();
    } catch (err: any) {
      setError(err.message || 'Failed to create identity profile.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEnrollBiometrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpeakerForEnroll) return;
    if (!enrollConsent) {
      setError('Explicit biometric voice processing consent is required by enterprise compliance policy.');
      return;
    }
    if (!enrollFile) {
      setError('Please provide a reference voice sample (WAV/MP3 format).');
      return;
    }

    setEnrollLoading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', enrollFile);
    formData.append('consent_recorded', 'true');

    try {
      await api.speakers.enrollExisting(selectedSpeakerForEnroll.speaker_id, formData);
      setSuccessMsg(
        `Biometric voice vector successfully enrolled for ${selectedSpeakerForEnroll.display_name}. Raw audio purged; unit embedding indexed.`
      );
      setShowEnrollModal(false);
      setEnrollConsent(false);
      setEnrollFile(null);
      setSelectedSpeakerForEnroll(null);
      await loadIdentities();
    } catch (err: any) {
      setError(err.message || 'Biometric enrollment failed.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleToggleMfa = async (profile: IdentityProfile) => {
    try {
      await api.speakers.update(profile.speaker_id, {
        mfa_enabled: !profile.mfa_enabled,
      });
      await loadIdentities();
    } catch (err: any) {
      setError(err.message || 'Failed to update MFA policy.');
    }
  };

  const handleDelete = async (profile: IdentityProfile) => {
    if (!confirm(`Permanently purge biometric representation and security credentials for ${profile.display_name}?`)) {
      return;
    }
    try {
      await api.speakers.delete(profile.speaker_id);
      await loadIdentities();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
              Enterprise Identity Registry
            </h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
              TRUSTED REPOSITORY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust identity verification directory. Maps executive credentials, trusted phone identifiers, ECAPA-TDNN unit acoustic vectors, and allowed operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadIdentities}
            className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg cursor-pointer transition"
            title="Refresh Identities"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Identity</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Identities Grid */}
      {speakers.length === 0 && !loading ? (
        <EmptyState
          icon={Users}
          title="No Registered Identities"
          description="Register executive and personnel profiles to enable cryptographic caller intelligence and speaker anomaly detection."
          actionText="Register Reference Identity"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {speakers.map((sp) => {
            const allowedOps: string[] = sp.allowed_operations || [];

            return (
              <div
                key={sp.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition"
              >
                <div>
                  {/* Top Bar: Identifier & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                        {sp.speaker_id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                        {sp.display_name}
                      </h3>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        sp.identity_status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {sp.identity_status || 'VERIFIED'}
                    </span>
                  </div>

                  {/* Organization & Role */}
                  <div className="mt-3 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sp.role_title || sp.department || 'Executive'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sp.organization || 'Enterprise Org'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sp.caller_id || 'Not Bound'}</span>
                    </div>
                  </div>

                  {/* Biometric Vector Status */}
                  <div className="mt-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Voice Vector:</span>
                      {sp.has_embedding ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          128-dim Unit Vector
                        </span>
                      ) : (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Not Enrolled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>Threshold: &le;{sp.risk_threshold || 70}</span>
                      <span>MFA: {sp.mfa_enabled ? 'Enforced' : 'Optional'}</span>
                    </div>
                  </div>

                  {/* Allowed Operations */}
                  {allowedOps.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                        Authorized Actions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {allowedOps.map((op, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/50"
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleMfa(sp)}
                      className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition ${
                        sp.mfa_enabled
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title="Toggle Multi-Factor Requirement"
                    >
                      MFA: {sp.mfa_enabled ? 'ON' : 'OFF'}
                    </button>

                    {!sp.has_embedding && (
                      <button
                        onClick={() => {
                          setSelectedSpeakerForEnroll(sp);
                          setShowEnrollModal(true);
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-700/50 cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Enroll Voice</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(sp)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Purge Identity Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Identity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 uppercase">Register Enterprise Identity</span>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Speaker / Employee ID *</label>
                <input
                  type="text"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. EMP-9022"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Full Legal / Display Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. Priya Nair"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Role / Title</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    placeholder="e.g. VP Operations"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Organization</label>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                    placeholder="e.g. ABC Bank"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Registered Caller ID / Phone</label>
                <input
                  type="text"
                  value={newCallerId}
                  onChange={(e) => setNewCallerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="e.g. +91 98765 00000"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Allowed Sensitive Operations</label>
                <input
                  type="text"
                  value={newAllowedOps}
                  onChange={(e) => setNewAllowedOps(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-slate-200"
                  placeholder="Comma-separated: WIRE_TRANSFER, APPROVAL"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="newMfa"
                  checked={newMfa}
                  onChange={(e) => setNewMfa(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-600"
                />
                <label htmlFor="newMfa" className="text-slate-300 text-[11px] cursor-pointer">
                  Require Out-of-Band MFA for High Sensitivity Actions
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Registering...' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Biometrics Modal */}
      {showEnrollModal && selectedSpeakerForEnroll && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-100 uppercase">
                Enroll Voice Biometrics &bull; {selectedSpeakerForEnroll.display_name}
              </span>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEnrollBiometrics} className="space-y-4">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                A 128-dimensional acoustic embedding vector will be calculated from this sample. Under the Privacy-by-Design charter, raw audio is immediately discarded from memory once the vector is generated.
              </p>

              <div className="p-4 rounded-lg bg-slate-950 border border-dashed border-slate-700 text-center">
                <Upload className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setEnrollFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-600 cursor-pointer"
                >
                  {enrollFile ? enrollFile.name : 'Select Voice Sample (WAV / MP3)'}
                </button>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <input
                  type="checkbox"
                  id="consent"
                  checked={enrollConsent}
                  onChange={(e) => setEnrollConsent(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-950 text-cyan-600"
                />
                <label htmlFor="consent" className="text-[10px] text-slate-300 cursor-pointer leading-tight">
                  I certify that explicit consent has been recorded for biometric feature extraction in compliance with privacy regulations.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollLoading}
                  className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold cursor-pointer disabled:opacity-50"
                >
                  {enrollLoading ? 'Extracting Vector...' : 'Enroll Biometrics'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compliance Disclaimer */}
      <PrototypeDisclaimer />
    </div>
  );
};
