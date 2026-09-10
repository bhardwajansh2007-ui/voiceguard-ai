import React, { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Upload, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { Speaker } from '../types';
import { EmptyState } from '../components/EmptyState';

export const SpeakerVerification: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Form State (Empty defaults, zero demo data)
  const [speakerId, setSpeakerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [department, setDepartment] = useState('');
  const [consentRecorded, setConsentRecorded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadSpeakers = async () => {
    setLoading(true);
    try {
      const data = await api.speakers.list();
      setSpeakers(data);
    } catch (err) {
      console.error('Failed to load speakers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpeakers();
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentRecorded) {
      setError('Explicit biometric voice processing consent is required by policy.');
      return;
    }
    if (!file) {
      setError('Please provide a voice recording sample (WAV/MP3).');
      return;
    }

    setEnrollLoading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('speaker_id', speakerId);
    formData.append('display_name', displayName);
    if (department) formData.append('department', department);
    formData.append('consent_recorded', String(consentRecorded));
    formData.append('file', file);

    try {
      const created = await api.speakers.enroll(formData);
      setSuccessMsg(`Speaker ${created.display_name} (${created.speaker_id}) enrolled with 128-dim acoustic embedding.`);
      setShowEnrollModal(false);
      // Reset form
      setSpeakerId('');
      setDisplayName('');
      setConsentRecorded(false);
      setFile(null);
      await loadSpeakers();
    } catch (err: any) {
      setError(err.message || 'Failed to enroll speaker.');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDelete = async (spId: string) => {
    if (!confirm(`Are you sure you want to permanently purge biometric embeddings for ${spId}?`)) {
      return;
    }
    try {
      await api.speakers.delete(spId);
      await loadSpeakers();
    } catch (err: any) {
      alert(`Purge failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100 uppercase font-mono m-0">
            Speaker Biometric Registry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Privacy-by-Design voice representation directory. Embeddings stored securely; raw audio permanently discarded.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSpeakers}
            title="Refresh Directory"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs uppercase tracking-wider rounded-lg shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Authorized Speaker</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Directory Table / Empty State */}
      {speakers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Registered Speakers"
          description="The biometric identity registry contains zero voice profiles. Register trusted personnel with consented voice audio to enable speaker verification."
          actionText="Enroll First Speaker"
          onAction={() => setShowEnrollModal(true)}
        />
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-mono text-slate-400 bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Speaker ID</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Consent Status</th>
                  <th className="py-2.5 px-3">Embedding Dim</th>
                  <th className="py-2.5 px-3">Model Tag</th>
                  <th className="py-2.5 px-3 text-right">Purge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {speakers.map((sp) => (
                  <tr key={sp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-cyan-400 font-bold">{sp.speaker_id}</td>
                    <td className="py-3 px-3 text-slate-100 font-sans font-medium">{sp.display_name}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{sp.department || 'General'}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        RECORDED
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {sp.has_embedding ? '128-D Vector (L2)' : 'NO EMBEDDING'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{sp.model_version}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(sp.speaker_id)}
                        title="Purge biometric records"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Enroll Authorized Voice Profile</span>
              </h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleEnroll} className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-slate-400 mb-1">Speaker Identification Tag</label>
                <input
                  type="text"
                  required
                  value={speakerId}
                  onChange={(e) => setSpeakerId(e.target.value)}
                  placeholder="Unique ID (e.g. employee ID or tag)"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-mono text-slate-400 mb-1">Full Legal / Display Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name of speaker"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>

              <div>
                <label className="block font-mono text-slate-400 mb-1">Department / Organization</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department or team (optional)"
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200"
                />
              </div>

              <div>
                <label className="block font-mono text-slate-400 mb-1">Voice Audio Sample (WAV / MP3)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".wav,.mp3,.flac,.m4a"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-400 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-cyan-950 file:text-cyan-400"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Sample must be at least 1.0s long. Raw audio is processed and immediately purged.
                </span>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consentRecorded}
                    onChange={(e) => setConsentRecorded(e.target.checked)}
                    className="mt-0.5 accent-cyan-500"
                  />
                  <span className="text-[11px] leading-snug text-slate-400">
                    <strong className="text-slate-200">Explicit Biometric Consent:</strong> I confirm this individual has
                    authorized voice representation extraction for organization impersonation defense under privacy policy.
                  </span>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-semibold rounded cursor-pointer"
                >
                  {enrollLoading ? 'Extracting Embedding...' : 'Register Speaker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
