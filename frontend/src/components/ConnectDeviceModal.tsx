import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Copy, Check, ExternalLink, X, Radio, Shield, Info } from 'lucide-react';

interface ConnectDeviceModalProps {
  callId: string;
  isOpen: boolean;
  onClose: () => void;
  lanIp?: string;
}

export const ConnectDeviceModal: React.FC<ConnectDeviceModalProps> = ({
  callId,
  isOpen,
  onClose,
  lanIp = '192.168.1.34',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [useLanIp, setUseLanIp] = useState(true);

  // Compute remote URL
  const port = window.location.port || '5173';
  const host = useLanIp ? lanIp : window.location.hostname;
  const callerUrl = `${window.location.protocol}//${host}:${port}/?mode=caller&call_id=${callId}`;

  useEffect(() => {
    if (isOpen && callId) {
      QRCode.toDataURL(callerUrl, {
        width: 220,
        margin: 1,
        color: {
          dark: '#06b6d4',
          light: '#07090e',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, callerUrl, callId]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(callerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b0f19] border border-cyan-500/30 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono uppercase tracking-wide text-slate-100 m-0 flex items-center gap-2">
                Connect 2nd Device / Phone
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Two-Party Voice Integrity Inspection Channel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          {/* IP Toggle */}
          <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Network Address:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseLanIp(true)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  useLanIp
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Wi-Fi LAN ({lanIp})
              </button>
              <button
                type="button"
                onClick={() => setUseLanIp(false)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  !useLanIp
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Localhost ({window.location.hostname})
              </button>
            </div>
          </div>

          {/* QR Code and Instructions */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="p-2 bg-[#07090e] border border-cyan-500/30 rounded-lg shrink-0">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Remote Caller QR Code" className="w-36 h-36 rounded" />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center font-mono text-xs text-slate-500">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-mono text-cyan-400 font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>How to Test with 2 Devices:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Connect your phone to the same Wi-Fi.</li>
                <li>Scan the QR code with your phone camera.</li>
                <li>Tap <strong className="text-emerald-400">"Start Call & Speak"</strong> on the phone.</li>
                <li>Watch this screen inspect audio in real time!</li>
              </ol>
              <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>Monitored Session: <strong className="text-slate-200 font-mono">{callId}</strong></span>
              </div>
            </div>
          </div>

          {/* URL Bar */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              Direct Caller Portal URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={callerUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Single Computer Demo Link */}
          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800">
            <span className="text-slate-500">Testing on one machine?</span>
            <a
              href={callerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition"
            >
              <span>Open Caller in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
