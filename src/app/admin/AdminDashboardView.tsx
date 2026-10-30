'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EventWithStats } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  LogOut,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';

interface Props {
  initialEvents: EventWithStats[];
}

export default function AdminDashboardView({ initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithStats[]>(initialEvents);

  // Time-based greeting: Selamat pagi / siang / sore / malam
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  // Dynamic Date string formatted in Indonesian: "Minggu, 18 Oktober 2026"
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  // Current month name for stat badge: "Oktober"
  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  }, []);

  // Active event for the first stat card
  const activeEvent = useMemo(() => {
    return events.find((e) => e.is_active) || events[0] || null;
  }, [events]);

  // Total events and completed events
  const totalEvents = events.length;
  const completedEvents = useMemo(() => {
    return events.filter((e) => !e.is_active).length;
  }, [events]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(null);

  // Form State for Create Event
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formQuota, setFormQuota] = useState<number | string>(150);
  const [formStartTime, setFormStartTime] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [formDuration, setFormDuration] = useState<number | string>(3);
  const [formPin, setFormPin] = useState('8821');

  // Form State for Edit Event
  const [editName, setEditName] = useState('');
  const [editQuota, setEditQuota] = useState<number | string>(150);
  const [editStartTime, setEditStartTime] = useState('');
  const [editDuration, setEditDuration] = useState<number | string>(3);
  const [editPin, setEditPin] = useState('');

  // Auto-generate slug from create name
  function handleNameChange(name: string) {
    setFormName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormSlug(slug);
  }

  // Live timer tick for badge status calculation
  const [nowTime, setNowTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute 4-state event badge: Akan Datang, Sedang Berjalan, Selesai, Jeda
  function getEventStatusBadge(ev: EventWithStats) {
    const start = new Date(ev.start_time).getTime();
    const end = new Date(ev.end_time).getTime();

    if (ev.is_active) {
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
  }

  // Refresh all events
  async function refreshEvents() {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (res.ok && data.success && data.events) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error('Refresh events error', e);
      showToast('error', 'Gagal memuat ulang data event.');
    } finally {
      setIsRefreshing(false);
    }
  }

  // Handle Create New Event
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: formName,
          event_slug: formSlug,
          quota: Number(formQuota) || 150,
          start_time: new Date(formStartTime).toISOString(),
          duration_hours: Number(formDuration) || 3,
          pin_code: formPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setFormName('');
        setFormSlug('');
        await refreshEvents();
        showToast('success', data.message || 'Event baru berhasil dibuat dan diterbitkan.');
      } else {
        showToast('error', data.message || 'Gagal membuat event.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat membuat event.');
    } finally {
      setActionLoading(false);
    }
  }

  // Open Edit Modal
  function openEditModal(event: EventWithStats) {
    if (Date.now() >= new Date(event.start_time).getTime()) {
      showToast('error', 'Event yang sedang berjalan atau sudah selesai tidak dapat diedit.');
      return;
    }
    setEditingEvent(event);
    setEditName(event.event_name);
    setEditQuota(event.quota);
    setEditStartTime(new Date(event.start_time).toISOString().slice(0, 16));
    setEditDuration(event.duration_hours || 3);
    setEditPin(event.pin_code || '1234');
  }

  // Handle Save Edit Event
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent || actionLoading) return;

    if (Date.now() >= new Date(editingEvent.start_time).getTime()) {
      showToast('error', 'Event yang sedang berjalan atau sudah selesai tidak dapat diedit.');
      setEditingEvent(null);
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${editingEvent.event_slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          event_name: editName,
          quota: Number(editQuota) || 150,
          start_time: new Date(editStartTime).toISOString(),
          duration_hours: Number(editDuration) || 3,
          pin_code: editPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditingEvent(null);
        await refreshEvents();
        showToast('success', data.message || 'Perubahan data event berhasil disimpan.');
      } else {
        showToast('error', data.message || 'Gagal memperbarui event.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat menyimpan perubahan event.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Delete Event
  async function handleConfirmDelete() {
    if (!deletingEvent || actionLoading) return;

    if (Date.now() >= new Date(deletingEvent.start_time).getTime()) {
      showToast('error', 'Event yang sedang berjalan atau sudah selesai tidak dapat dihapus.');
      setDeletingEvent(null);
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${deletingEvent.event_slug}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeletingEvent(null);
        await refreshEvents();
        showToast('success', data.message || 'Event berhasil dihapus.');
      } else {
        showToast('error', data.message || 'Gagal menghapus event.');
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat menghapus event.');
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
            onClick={refreshEvents}
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
        <div className="space-y-4 sm:space-y-5">
          {/* 1. Hero Greeting Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 flex flex-col gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                {greeting}, Bray!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                {formattedDate}
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full h-12 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Event</span>
            </button>
          </div>

          {/* 2. Stat Cards Grid (2 cols) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Card 1: Event Aktif */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <span>Event Aktif</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                {activeEvent && (
                  <Link
                    href={`/admin/events/${activeEvent.event_slug}`}
                    aria-label="Buka detail event aktif"
                    className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="Lihat Detail"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Link>
                )}
              </div>

              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1">
                  {activeEvent ? activeEvent.event_name : 'Tidak Ada Event'}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {activeEvent
                    ? `${new Date(activeEvent.start_time).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })} (${new Date(activeEvent.start_time).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} - ${new Date(activeEvent.end_time).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })})`
                    : 'Semua event telah selesai'}
                </p>
              </div>
            </div>

            {/* Card 2: Total Event */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className="text-xs font-semibold text-slate-700">Total Event</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100/80">
                  {currentMonthName}
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 font-mono tracking-tight">
                    {completedEvents}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-400 font-mono">
                    /{totalEvents}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. List Event Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-100 min-h-[360px]">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-3">
              List Event
            </h2>

            {events.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Belum ada event photobooth. Klik <strong>+ Tambah Event</strong> di atas untuk membuat jadwal baru.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 hover:bg-slate-50/60 -mx-2 px-2 rounded-2xl transition-colors"
                  >
                    {/* Left: Event Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                          {ev.event_name}
                        </h3>
                        {(() => {
                          const badge = getEventStatusBadge(ev);
                          return (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 border flex items-center gap-1 ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="text-slate-600 font-medium">
                          {new Date(ev.start_time).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          ({new Date(ev.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} -{' '}
                          {new Date(ev.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')})
                        </span>{' '}
                        |
                        <span className="inline-flex items-center text-xs font-medium text-slate-600">
                          {ev.stats.total_redeemed}/{ev.quota} kuota
                        </span>
                      </div>
                    </div>

                    {/* Right: 3 Action Buttons - Detail (ArrowUpRight Link), Edit (Pencil), Hapus (Trash) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* 1. Detail Button (Hijau Link) */}
                      <Link
                        href={`/admin/events/${ev.event_slug}`}
                        aria-label={`Buka detail event ${ev.event_name}`}
                        className="w-9 h-9 rounded-xl hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs border border-emerald-200 cursor-pointer"
                        title="Detail & Live Monitor"
                      >
                        <ArrowUpRight className="w-4 h-4 stroke-[2.3]" />
                      </Link>

                      {/* 2. Edit Button (Kuning jika belum mulai, Abu-abu Disabled jika sedang berjalan atau selesai) */}
                      {(() => {
                        const startMs = new Date(ev.start_time).getTime();
                        const endMs = new Date(ev.end_time).getTime();
                        const isFinished = nowTime > endMs;
                        const isLocked = nowTime >= startMs;

                        return (
                          <button
                            onClick={() => !isLocked && openEditModal(ev)}
                            disabled={isLocked}
                            aria-label={
                              isLocked
                                ? isFinished
                                  ? `Event ${ev.event_name} sudah selesai dan tidak dapat diedit`
                                  : `Event ${ev.event_name} sedang berjalan dan tidak dapat diedit`
                                : `Edit event ${ev.event_name}`
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs border transition-colors ${
                              isLocked
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                : 'hover:bg-amber-500 text-amber-600 hover:text-white border-amber-200 active:scale-95 cursor-pointer'
                            }`}
                            title={
                              isLocked
                                ? isFinished
                                  ? 'Event sudah selesai (tidak dapat diedit)'
                                  : 'Event sedang berjalan (tidak dapat diedit)'
                                : 'Edit Event'
                            }
                          >
                            <Edit2 className="w-4 h-4 stroke-[2.2]" />
                          </button>
                        );
                      })()}

                      {/* 3. Hapus Button (Merah jika belum mulai, Abu-abu Disabled jika sedang berjalan atau selesai) */}
                      {(() => {
                        const startMs = new Date(ev.start_time).getTime();
                        const endMs = new Date(ev.end_time).getTime();
                        const isFinished = nowTime > endMs;
                        const isLocked = nowTime >= startMs;

                        return (
                          <button
                            onClick={() => !isLocked && setDeletingEvent(ev)}
                            disabled={isLocked}
                            aria-label={
                              isLocked
                                ? isFinished
                                  ? `Event ${ev.event_name} sudah selesai dan tidak dapat dihapus`
                                  : `Event ${ev.event_name} sedang berjalan dan tidak dapat dihapus`
                                : `Hapus event ${ev.event_name}`
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs border transition-colors ${
                              isLocked
                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                : 'hover:bg-red-500 text-red-600 hover:text-white border-red-200 active:scale-95 cursor-pointer'
                            }`}
                            title={
                              isLocked
                                ? isFinished
                                  ? 'Event sudah selesai (tidak dapat dihapus)'
                                  : 'Event sedang berjalan (tidak dapat dihapus)'
                                : 'Hapus Event'
                            }
                          >
                            <Trash2 className="w-4 h-4 stroke-[2.2]" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: BUAT EVENT BARU */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Buat Event Photobooth Baru</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Event
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter event name"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Slug (Otomatis)
                </label>
                <input
                  type="text"
                  disabled
                  placeholder="Auto filled"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kuota Sesi
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={formQuota}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormQuota(v === '' ? '' : parseInt(v, 10) || 0);
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durasi (Jam)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={formDuration}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormDuration(v === '' ? '' : parseInt(v, 10) || 0);
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-2 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Kru Scanner
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-mono text-center tracking-widest text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan & Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: EDIT EVENT */}
      {/* ============================================================ */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Data Event</h3>
                <p className="text-xs text-slate-400 font-mono">slug: {editingEvent.event_slug}</p>
              </div>
              <button
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Event
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kuota Sesi
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    required
                    value={editQuota}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditQuota(v === '' ? '' : parseInt(v, 10) || 0);
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durasi (Jam)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editDuration}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditDuration(v === '' ? '' : parseInt(v, 10) || 0);
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-2 text-xs text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Kru Scanner
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-mono text-center tracking-widest text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: KONFIRMASI HAPUS EVENT */}
      {/* ============================================================ */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3.5 border border-red-100">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Hapus Event?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Hapus <strong className="text-slate-900 font-bold">&quot;{deletingEvent.event_name}&quot;</strong> beserta seluruh tiketnya secara permanen?
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {actionLoading ? 'Menghapus...' : 'Hapus Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
