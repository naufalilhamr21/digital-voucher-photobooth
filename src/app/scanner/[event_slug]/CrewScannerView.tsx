'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { EventWithStats, RedemptionResult } from '@/lib/types';
import { playErrorBuzz, playSuccessChime, playWarningTone } from '@/lib/utils/audio';
import { normalizeToken } from '@/lib/utils/token';
import {
  Camera,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
  Volume2,
} from 'lucide-react';

interface Props {
  initialEvent: EventWithStats;
}

export default function CrewScannerView({ initialEvent }: Props) {
  const [event, setEvent] = useState<EventWithStats>(initialEvent);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<RedemptionResult | null>(null);
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<boolean>(false);

  const scannerRef = useRef<unknown>(null);
  const authKey = `crew_auth_${event.event_slug}`;

  // Check PIN session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(authKey);
      if (stored === 'unlocked') {
        setIsUnlocked(true);
      }
    }
  }, [authKey]);

  // Handle PIN Unlock
  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);

    const inputClean = pinInput.trim();
    if (!inputClean) {
      setPinError('Masukkan PIN kru.');
      return;
    }

    try {
      const res = await fetch(`/api/events/${event.event_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_pin', pin: inputClean }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsUnlocked(true);
        sessionStorage.setItem(authKey, 'unlocked');
      } else {
        setPinError(data.message || 'PIN kru salah.');
      }
    } catch {
      setPinError('Gagal memverifikasi PIN. Periksa jaringan.');
    }
  }

  // Refresh live event stats
  const refreshEventStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event.event_slug}`);
      const data = await res.json();
      if (res.ok && data.success && data.event) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error('Stats refresh failed', e);
    }
  }, [event.event_slug]);

  // Execute Voucher Redemption
  const processRedemption = useCallback(
    async (tokenInput: string) => {
      if (cooldown || isProcessing) return;

      const token = normalizeToken(tokenInput);
      if (!token) return;

      setIsProcessing(true);
      setCooldown(true);

      try {
        const res = await fetch('/api/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_slug: event.event_slug,
            token,
          }),
        });

        const data: RedemptionResult = await res.json();
        setLastResult(data);

        if (data.status === 'success') {
          playSuccessChime();
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([100, 50, 100]); } catch {}
          }
          refreshEventStats();
        } else if (data.status === 'already_redeemed') {
          playErrorBuzz();
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([250, 100, 250]); } catch {}
          }
        } else {
          playWarningTone();
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(200); } catch {}
          }
        }
      } catch {
        const networkErr: RedemptionResult = {
          status: 'error',
          message: 'Gagal menghubungi server. Periksa koneksi internet.',
        };
        setLastResult(networkErr);
        playErrorBuzz();
      } finally {
        setIsProcessing(false);
        // Cooldown prevents camera from re-reading same QR multiple times
        setTimeout(() => setCooldown(false), 2500);
      }
    },
    [cooldown, isProcessing, event.event_slug, refreshEventStats]
  );

  // Initialize html5-qrcode scanner
  useEffect(() => {
    if (!isUnlocked) return;

    let html5QrCode: any = null;
    let isCancelled = false;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (isCancelled) return;

        const qrRegion = document.getElementById('qr-reader');
        if (!qrRegion) return;

        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            processRedemption(decodedText);
          },
          () => {
            // scan error or no code found in frame, ignore
          }
        );

        setScannerActive(true);
        setScannerError(null);
      } catch (err: unknown) {
        console.warn('Camera start error', err);
        setScannerActive(false);
        setScannerError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera aktif atau gunakan form input manual di bawah.'
        );
      }
    }

    startScanner();

    return () => {
      isCancelled = true;
      if (html5QrCode) {
        html5QrCode
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              html5QrCode.clear();
            } catch {}
          });
      }
    };
  }, [isUnlocked, processRedemption]);

  // Manual token submission
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualToken.trim()) return;
    processRedemption(manualToken);
    setManualToken('');
  }

  // 1. PIN GATE VIEW
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto mb-5">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-1">Akses Kru Photobooth</h2>
          <p className="text-xs text-slate-400 mb-6">{event.event_name}</p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="pin-input" className="block text-xs text-slate-300 font-semibold mb-2 text-left">
                Masukkan PIN Kru (4-6 Digit)
              </label>
              <div className="relative">
                <input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-red-500"
                  autoFocus
                />
                <KeyRound className="w-5 h-5 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {pinError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-left">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all text-sm"
            >
              Buka Scanner Kru
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6">
            PIN default acara: <span className="font-mono text-slate-400">8821</span> atau{' '}
            <span className="font-mono text-slate-400">1234</span>
          </p>
        </div>
      </div>
    );
  }

  // 2. ACTIVE CREW SCANNER VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Top Header & Live Counter Bar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/icons/alineas-logo.png"
                alt="Alineas Studio"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-bold truncate max-w-[200px]">{event.event_name}</h1>
              <p className="text-xs text-slate-400">Scanner Kru Lapangan</p>
            </div>
          </div>

          <button
            onClick={refreshEventStats}
            aria-label="Segarkan data kuota"
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Metrics Strip */}
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2 mt-3">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Ditukarkan</span>
            <span className="text-base font-extrabold text-emerald-400 font-mono">
              {event.stats.total_redeemed}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {event.quota}</span>
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400">Sisa Kuota</span>
            <span className="text-base font-extrabold text-white font-mono">
              {event.stats.remaining_quota}
            </span>
          </div>
        </div>
      </header>

      {/* Main Scanner Section */}
      <main className="max-w-md mx-auto w-full p-4 flex-1 flex flex-col items-center justify-center relative">
        {/* Full-Screen / Modal Result Overlay */}
        {lastResult && (
          <div
            className={`w-full mb-4 p-5 rounded-2xl border transition-all ${
              lastResult.status === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-white'
                : lastResult.status === 'already_redeemed'
                ? 'bg-red-950/90 border-red-500 text-white'
                : 'bg-amber-950/90 border-amber-500 text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastResult.status === 'success' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
              ) : lastResult.status === 'already_redeemed' ? (
                <XCircle className="w-7 h-7 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base tracking-wide uppercase">
                    {lastResult.status === 'success'
                      ? 'Voucher Berhasil Ditukarkan'
                      : lastResult.status === 'already_redeemed'
                      ? 'Duplikat / Sudah Ditukarkan'
                      : 'Validasi Ditolak'}
                  </h3>
                  <button
                    onClick={() => setLastResult(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-black/30"
                  >
                    Tutup
                  </button>
                </div>

                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{lastResult.message}</p>

                {lastResult.voucher && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">TOKEN: {lastResult.voucher.token}</span>
                    {lastResult.redeemed_at && (
                      <span className="text-slate-300">
                        {new Date(lastResult.redeemed_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Camera Viewport Frame */}
        <div className="relative w-full aspect-square max-w-[340px] bg-black rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
          <div id="qr-reader" className="w-full h-full" />

          {/* Viewfinder Target Guidelines */}
          {scannerActive && (
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
              </div>
              <div className="animate-scanline" />
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
              </div>
            </div>
          )}

          {!scannerActive && (
            <div className="p-6 text-center">
              <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {scannerError || 'Mempersiapkan kamera pemindai...'}
              </p>
            </div>
          )}
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-950/60 px-3 py-1.5 rounded-full border border-red-800">
            <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            <span>Memverifikasi tiket...</span>
          </div>
        )}

        {/* Fallback Manual Token Entry Form */}
        <div className="w-full max-w-[340px] mt-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              maxLength={8}
              placeholder="Input 6 Karakter (contoh: T9K2WP)"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value.toUpperCase())}
              className="flex-1 h-12 bg-slate-900 border border-slate-700 rounded-xl px-4 text-center font-mono text-base font-bold tracking-widest text-white focus:outline-none focus:border-red-500 uppercase placeholder:text-slate-500 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans"
            />
            <button
              type="submit"
              disabled={isProcessing || !manualToken.trim()}
              className="h-12 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center shrink-0 shadow-md"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Gunakan input manual jika layar tamu redup atau retak.
          </p>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="p-4 bg-slate-900/60 border-t border-slate-800 text-center">
        <div className="max-w-md mx-auto flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Audio Umpan Balik Aktif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Tutup:{' '}
              {new Date(event.end_time).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              WIB
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
