'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { EventWithStats, Voucher } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  LogOut,
  Sliders,
  Users,
  AlertTriangle,
  Search,
  Ticket,
  Printer,
  X,
  Radio,
  Timer,
  ArrowLeft,
  Pause,
  Play,
} from 'lucide-react';

interface Props {
  initialEvent: EventWithStats;
}

export default function EventDetailView({ initialEvent }: Props) {
  const router = useRouter();
  const [event, setEvent] = useState<EventWithStats>(initialEvent);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [receptionEvent, setReceptionEvent] = useState<EventWithStats | null>(null);
  const [togglingEvent, setTogglingEvent] = useState<EventWithStats | null>(null);
  const [confirmOvertimeEvent, setConfirmOvertimeEvent] = useState<EventWithStats | null>(null);

  // Vouchers search & filter
  const [voucherSearch, setVoucherSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'redeemed' | 'pending'>('all');

  // Toast notification state
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute countdown string for event
  const countdownDisplay = useMemo(() => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();

    const formatDiff = (diffInSeconds: number) => {
      const days = Math.floor(diffInSeconds / 86400);
      const hours = Math.floor((diffInSeconds % 86400) / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = diffInSeconds % 60;

      if (days > 0) {
        return `${days} Hari ${hours} Jam`;
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (nowTime < start) {
      const diff = Math.max(0, Math.floor((start - nowTime) / 1000));
      return {
        text: formatDiff(diff),
        label: 'Akan Datang',
        status: 'upcoming',
      };
    } else if (nowTime > end) {
      return {
        text: '00:00:00',
        label: 'Selesai',
        status: 'ended',
      };
    } else {
      // Event is within schedule time
      if (!event.is_active) {
        return {
          text: 'DIJEDA',
          label: 'Sesi Dijeda',
          status: 'paused',
        };
      }

      const diff = Math.max(0, Math.floor((end - nowTime) / 1000));
      return {
        text: formatDiff(diff),
        label: 'Sedang Berjalan',
        status: 'active',
      };
    }
  }, [event, nowTime]);

  // Compute 4-state event badge
  const eventBadge = useMemo(() => {
    const start = new Date(event.start_time).getTime();
    const end = new Date(event.end_time).getTime();

    if (event.is_active) {
      if (nowTime < start) {
        return {
          label: 'Akan Datang',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      } else if (nowTime > end) {
        return {
          label: 'Selesai',
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };
      } else {
        return {
          label: 'Sedang Berjalan',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500 animate-pulse',
        };
      }
    } else {
      if (nowTime >= start && nowTime <= end) {
        return {
          label: 'Jeda',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
      }
      return {
        label: 'Selesai',
        bg: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
      };
    }
  }, [event, nowTime]);

  // Refresh single event data
  async function refreshEvent() {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/events/${event.event_slug}`);
      const data = await res.json();
      if (res.ok && data.success && data.event) {
        setEvent(data.event);
      }
    } catch (e) {
      console.error('Refresh event error', e);
      showToast('error', 'Gagal memuat ulang data event.');
    } finally {
      setIsRefreshing(false);
    }
  }

  // Quick Action: +1 Jam Overtime
  async function handleOvertime() {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${event.event_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'overtime' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmOvertimeEvent(null);
        await refreshEvent();
        showToast('success', data.message || 'Waktu event berhasil ditambah 1 jam overtime.');
      } else {
        showToast('error', data.message || 'Gagal menambah waktu overtime.');
      }
    } catch (e) {
      console.error('Overtime error', e);
      showToast('error', 'Terjadi kesalahan saat menambah waktu overtime.');
    } finally {
      setActionLoading(false);
    }
  }

  // Quick Action: Toggle Status (Jeda / Lanjutkan)
  async function handleToggleStatus() {
    if (actionLoading) return;
    setActionLoading(true);

    const targetActive = !event.is_active;

    try {
      const res = await fetch(`/api/events/${event.event_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          target_active: targetActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.event) {
          setEvent(data.event);
        }
        setTogglingEvent(null);
        await refreshEvent();
        showToast(
          'success',
          data.message ||
            (targetActive
              ? 'Event berhasil dilanjutkan kembali.'
              : 'Event berhasil dijeda sementara.')
        );
      } else {
        showToast('error', data.message || 'Gagal mengubah status event.');
      }
    } catch (e) {
      console.error('Toggle status error', e);
      showToast('error', 'Terjadi kesalahan saat mengubah status event.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Logout
  async function handleLogout() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      document.cookie = 'alineas_demo_auth=; path=/; max-age=0';
      sessionStorage.removeItem('alineas_admin_auth');
      sessionStorage.removeItem('alineas_admin_email');
    }
    router.push('/login');
    router.refresh();
  }

  // Filter vouchers in detail view
  const filteredVouchers = useMemo(() => {
    if (!event.vouchers) return [];
    return event.vouchers.filter((v: Voucher) => {
      const matchToken = v.token.toLowerCase().includes(voucherSearch.toLowerCase());
      if (statusFilter === 'redeemed') return matchToken && v.is_redeemed;
      if (statusFilter === 'pending') return matchToken && !v.is_redeemed;
      return matchToken;
    });
  }, [event.vouchers, voucherSearch, statusFilter]);

  // Host origin for links & QR
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const guestClaimUrl = `${appOrigin}/e/${event.event_slug}`;
  const crewScannerUrl = `${appOrigin}/scanner/${event.event_slug}`;

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900 flex flex-col selection:bg-[#D30000] selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-sm z-[60] animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500/40 shadow-emerald-900/15'
                : 'bg-red-600 text-white border-red-500/40 shadow-red-900/15'
            }`}
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <p className="text-xs font-semibold leading-snug flex-1 text-white">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header - Alineas Logo & Refresh Action */}
      <header className="w-full max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        <div className="relative w-28 h-10 sm:w-32 sm:h-12 shrink-0">
          <Image
            src="/icons/alineas-logo.png"
            alt="Alineas Studio"
            fill
            className="object-contain object-left"
            priority
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshEvent}
            disabled={isRefreshing}
            aria-label="Refresh data"
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D30000]' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            aria-label="Keluar akun"
            className="w-10 h-10 rounded-xl bg-white hover:bg-red-100 text-slate-600 hover:text-[#D30000] active:scale-95 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex-1 space-y-4 sm:space-y-5">
        <div className="space-y-3">
          {/* Top Navigation Row: Back to events on left, Status Badge on right */}
          <div className="flex items-center justify-between">
            <Link
              href="/admin"
              aria-label="Kembali ke Daftar Event"
              title="Kembali ke Daftar Event"
              className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs flex items-center gap-2 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
              <span>Back to events</span>
            </Link>

            {eventBadge && (
              <span
                className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border shadow-xs ${eventBadge.bg}`}
              >
                <span className={`w-2 h-2 rounded-full ${eventBadge.dot}`} />
                <span>{eventBadge.label}</span>
              </span>
            )}
          </div>

          {/* Hero Monitor Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {event.event_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {new Date(event.start_time).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                ({new Date(event.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} -{' '}
                {new Date(event.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB)
              </p>
            </div>

            {/* Main Action Button: Tombol Scanner */}
            <a
              href={crewScannerUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full h-12 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-red-600/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Radio className="w-4 h-4 text-white" />
              <span>Buka Scanner Kru</span>
            </a>

            {/* Secondary Actions: Tiket Tamu & QR Meja */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <a
                href={guestClaimUrl}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-3 rounded-xl bg-white hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-red-600" />
                <span>Buka Tiket Tamu</span>
              </a>

              <button
                onClick={() => setReceptionEvent(event)}
                className="h-10 px-3 rounded-xl bg-slate-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Meja Resepsionis</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Metric 1: Klaim Tiket */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    Klaim Tamu
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {event.stats.total_claimed}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {event.stats.buffer_limit} tiket
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (event.stats.total_claimed / event.stats.buffer_limit) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 2: Penukaran Foto */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Penukaran Foto
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
                    {event.stats.total_redeemed}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {event.quota} sesi
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (event.stats.total_redeemed / event.quota) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Metric 3: Countdown Waktu */}
            <div
              className={`rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition-colors ${
                countdownDisplay.status === 'paused'
                  ? 'bg-amber-50/40 border-amber-300'
                  : 'bg-white border-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Timer
                      className={`w-4 h-4 ${
                        countdownDisplay.status === 'paused' ? 'text-amber-600' : 'text-red-500'
                      }`}
                    />
                    Countdown
                  </span>
                  {countdownDisplay.status === 'paused' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Waktu Ditahan
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                      countdownDisplay.status === 'paused' ? 'text-amber-700' : 'text-slate-950'
                    }`}
                  >
                    {countdownDisplay.text}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {countdownDisplay.status === 'paused' ? (
                    <span className="text-amber-700 font-medium">
                      Sesi dijeda (jam selesai otomatis mundur saat dilanjutkan)
                    </span>
                  ) : (
                    <>
                      Berakhir:{' '}
                      {new Date(event.end_time).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).replace('.', ':')}{' '}
                      WIB
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Strip - Shown when event is active or paused */}
          {(countdownDisplay.status === 'active' || countdownDisplay.status === 'paused') && (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">Kontrol Acara</h3>
                  <p className="text-xs text-slate-500">
                    Atur overtime dan jeda sesi photobooth.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
                <button
                  onClick={() => setConfirmOvertimeEvent(event)}
                  disabled={actionLoading}
                  className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>+1 Jam Overtime</span>
                </button>

                <button
                  onClick={() => setTogglingEvent(event)}
                  disabled={actionLoading}
                  className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
                    event.is_active
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                  }`}
                >
                  {event.is_active ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Jeda Event</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Lanjutkan Event</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Vouchers Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Voucher Diterbitkan ({filteredVouchers.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Semua token voucher tamu untuk event {event.event_name}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari token..."
                    value={voucherSearch}
                    onChange={(e) => setVoucherSearch(e.target.value)}
                    className="h-9 w-36 sm:w-48 bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 text-xs text-slate-900 focus:outline-none focus:border-red-600 uppercase font-mono"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>

                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-white shadow-xs text-slate-900'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setStatusFilter('redeemed')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'redeemed'
                        ? 'bg-white shadow-xs text-emerald-700'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Ditukarkan
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      statusFilter === 'pending'
                        ? 'bg-white shadow-xs text-amber-700'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Klaim
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">No</th>
                    <th className="px-5 py-3">Kode Token</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Waktu Klaim</th>
                    <th className="px-5 py-3">Waktu Penukaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredVouchers.length > 0 ? (
                    filteredVouchers.map((v, idx) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-5 py-3.5 font-mono font-bold text-sm text-slate-900">
                          {v.token}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full font-semibold ${
                              v.is_redeemed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {v.is_redeemed ? 'Sudah Ditukarkan' : 'Menunggu Sesi'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(v.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}{' '}
                          WIB
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {v.redeemed_at ? (
                            <span className="font-medium text-slate-900">
                              {new Date(v.redeemed_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}{' '}
                              WIB
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                        Belum ada voucher yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL: QR MEJA RESEPSIONIS */}
      {/* ============================================================ */}
      {receptionEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setReceptionEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-4 border-red-600 rounded-2xl p-6 bg-white shadow-inner flex flex-col items-center">
              <div className="relative w-28 h-12 mb-2">
                <Image
                  src="/icons/alineas-logo.png"
                  alt="Alineas Studio"
                  fill
                  className="object-contain"
                />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                Alineas Studio Photobooth
              </h4>
              <p className="text-xs font-bold text-red-600 mb-4">{receptionEvent.event_name}</p>

              <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                <QRCodeSVG
                  value={`${appOrigin}/e/${receptionEvent.event_slug}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="text-xs font-bold text-slate-900 mt-4 uppercase tracking-wider">
                Scan QR Code untuk Klaim Voucher
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                Arahkan kamera smartphone Anda ke QR code di atas untuk mendapatkan tiket sesi foto.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Meja</span>
              </button>
              <button
                onClick={() => setReceptionEvent(null)}
                className="px-4 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI JEDA / LANJUTKAN EVENT */}
      {/* ============================================================ */}
      {togglingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3.5 border ${
                togglingEvent.is_active
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {togglingEvent.is_active ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {togglingEvent.is_active ? 'Jeda Event?' : 'Lanjutkan Event?'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {togglingEvent.is_active ? (
                <>
                  Klaim dan scan tiket <strong className="text-slate-900 font-bold">&quot;{togglingEvent.event_name}&quot;</strong> akan dinonaktifkan sementara.
                </>
              ) : (
                <>
                  Aktifkan kembali klaim dan scan tiket untuk <strong className="text-slate-900 font-bold">&quot;{togglingEvent.event_name}&quot;</strong>.
                </>
              )}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setTogglingEvent(null)}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={actionLoading}
                className={`flex-1 h-10 rounded-xl text-white font-bold text-xs shadow-md transition-colors cursor-pointer ${
                  togglingEvent.is_active
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionLoading
                  ? 'Memproses...'
                  : togglingEvent.is_active
                    ? 'Jeda Event'
                    : 'Lanjutkan Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: KONFIRMASI OVERTIME */}
      {/* ============================================================ */}
      {confirmOvertimeEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-200">
              <Clock className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Tambah Overtime?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tambah durasi event <strong className="text-slate-900 font-bold">&quot;{confirmOvertimeEvent.event_name}&quot;</strong> sebanyak 1 jam?
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOvertimeEvent(null)}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleOvertime}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {actionLoading ? 'Menyimpan...' : '+1 Jam Overtime'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

