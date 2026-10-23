'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { EventWithStats, Voucher } from '@/lib/types';
import { Camera, CheckCircle2, Clock, Copy, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

interface Props {
  initialEvent: EventWithStats;
}

export default function GuestClaimView({ initialEvent }: Props) {
  const [event, setEvent] = useState<EventWithStats>(initialEvent);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [claiming, setClaiming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const storageKey = `alineas_voucher_${event.event_slug}`;

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.token) {
            setVoucher(parsed);
          }
        }
      } catch (e) {
        console.error('Error reading localStorage', e);
      }
      setLoading(false);
    }
  }, [storageKey]);

  // Handler to claim new voucher
  async function handleClaim() {
    setClaiming(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_slug: event.event_slug }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || 'Gagal mengklaim voucher photobooth.');
        setClaiming(false);
        return;
      }

      setVoucher(data.voucher);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(data.voucher));
      }
    } catch {
      setErrorMsg('Koneksi terputus. Pastikan perangkat Anda terhubung ke internet.');
    } finally {
      setClaiming(false);
    }
  }

  // Refresh status from server to see if voucher has been redeemed
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/events/${event.event_slug}`);
      const data = await res.json();
      if (res.ok && data.success && data.event) {
        setEvent(data.event);

        if (voucher) {
          const updatedVoucher = (data.event.vouchers || []).find(
            (v: Voucher) => v.token === voucher.token
          );
          if (updatedVoucher) {
            setVoucher(updatedVoucher);
            localStorage.setItem(storageKey, JSON.stringify(updatedVoucher));
          }
        }
      }
    } catch (e) {
      console.error('Refresh error', e);
    } finally {
      setRefreshing(false);
    }
  }

  function handleCopy() {
    if (!voucher) return;
    navigator.clipboard.writeText(voucher.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Memeriksa tiket Anda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Top Brand Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 shrink-0">
            <Image
              src="/icons/alineas-logo.png"
              alt="Alineas Studio"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Alineas Studio</h1>
            <p className="text-xs text-slate-500">Digital Photobooth Pass</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Segarkan status tiket"
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm active:scale-95 transition-transform"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full my-auto">
        {voucher ? (
          /* CLAIMED TICKET PASS VIEW */
          <div className="relative bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Header Banner */}
            <div className="bg-red-600 p-5 text-white">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold tracking-wider uppercase text-red-100">
                  Tiket Resmi Photobooth
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    voucher.is_redeemed
                      ? 'bg-slate-900 text-slate-100'
                      : 'bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {voucher.is_redeemed ? 'Sudah Ditukarkan' : 'Siap Digunakan'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{event.event_name}</h2>
            </div>

            {/* Instruction Banner */}
            <div className="bg-red-50 border-y border-red-100 px-4 py-2.5 flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-xs font-semibold text-red-900">
                Screenshot layar ini sekarang! Tunjukkan ke kru photobooth.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="p-6 flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
                <QRCodeSVG
                  value={voucher.token}
                  size={200}
                  level="H"
                  includeMargin={false}
                  className="rounded-lg"
                />
              </div>

              {/* Monospace Token Box */}
              <div className="mt-5 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">
                  Kode Voucher Anda
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-token text-3xl font-extrabold text-slate-950 tracking-widest">
                    {voucher.token}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-red-600 hover:border-red-200 shadow-sm active:scale-95 transition-all"
                    title="Salin Kode Voucher"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <span className="text-xs text-emerald-600 font-semibold mt-1">
                    Kode berhasil disalin!
                  </span>
                )}
              </div>
            </div>

            {/* Perforation Separator */}
            <div className="relative flex items-center justify-between px-2 py-1">
              <div className="ticket-cutout-left border-r border-slate-200" />
              <div className="w-full border-t-2 border-dashed border-slate-200 mx-5" />
              <div className="ticket-cutout-right border-l border-slate-200" />
            </div>

            {/* Ticket Metadata Details */}
            <div className="p-6 bg-slate-50/50 space-y-3 text-xs text-slate-600">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Waktu Acara</span>
                <span className="font-medium text-slate-900">
                  {new Date(event.start_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(event.end_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Status Penukaran</span>
                <span
                  className={`font-semibold ${
                    voucher.is_redeemed ? 'text-slate-700' : 'text-emerald-600'
                  }`}
                >
                  {voucher.is_redeemed
                    ? `Ditukarkan (${new Date(voucher.redeemed_at || '').toLocaleTimeString(
                        'id-ID',
                        { hour: '2-digit', minute: '2-digit' }
                      )} WIB)`
                    : 'Belum Ditukarkan'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">ID Tiket</span>
                <span className="font-mono text-slate-400">{voucher.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* CLAIM FORM / HERO CARD VIEW */
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 flex flex-col items-center text-center">
            {/* Header Badge */}
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-5 shadow-sm">
              <Camera className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
              {event.event_name}
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Selamat datang di photobooth Alineas Studio! Dapatkan 1 voucher digital Anda untuk sesi
              foto eksklusif di venue.
            </p>

            {/* Event Time & Quota Details */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 space-y-2 text-left">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Jam Operasional
                </span>
                <span className="font-semibold text-slate-900">
                  {new Date(event.start_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(event.end_time).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  WIB
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-slate-400" />
                  Ketersediaan Kuota
                </span>
                <span className="font-semibold text-slate-900">
                  {event.stats.remaining_quota > 0
                    ? `Tersedia (${event.stats.remaining_quota} slot)`
                    : 'Hampir Habis (Buffer)'}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="w-full mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Claim Action Button */}
            {!event.is_active ? (
              <div className="w-full py-4 px-6 rounded-2xl bg-slate-100 text-slate-500 font-semibold text-sm">
                Event Photobooth Telah Ditutup
              </div>
            ) : event.stats.total_claimed >= event.stats.buffer_limit ? (
              <div className="w-full py-4 px-6 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm">
                Kuota Tiket Habis
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base shadow-lg shadow-red-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {claiming ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menerbitkan Tiket...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Klaim Voucher Photobooth</span>
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-slate-400 mt-4">
              1 tiket berlaku untuk 1 sesi foto photobooth.
            </p>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="max-w-md mx-auto w-full pt-6 text-center text-xs text-slate-400">
        <p>Alineas Studio Photobooth System</p>
      </footer>
    </div>
  );
}
