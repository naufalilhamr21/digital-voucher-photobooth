'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { EventWithStats, Voucher } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
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
  Shield,
  Edit2,
  Trash2,
  Eye,
  ArrowLeft,
  ArrowUpRight,
} from 'lucide-react';

interface Props {
  initialEvents: EventWithStats[];
}

export default function AdminDashboardView({ initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithStats[]>(initialEvents);

  // State: selected event for detail/live monitor. If null -> displays Event List.
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);

  // Dynamic admin user greeting
  const [adminName, setAdminName] = useState('Naufal');

  // useEffect(() => {
  //   async function loadAdminUser() {
  //     const supabase = createClient();
  //     if (supabase) {
  //       const { data: { user } } = await supabase.auth.getUser();
  //       if (user?.email) {
  //         const rawName = (user.user_metadata?.full_name as string) || user.email.split('@')[0];
  //         const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  //         setAdminName(cleanName);
  //         return;
  //       }
  //     }
  //     if (typeof window !== 'undefined') {
  //       const stored = sessionStorage.getItem('alineas_admin_email');
  //       if (stored) {
  //         const rawName = stored.split('@')[0];
  //         const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  //         setAdminName(cleanName);
  //       }
  //     }
  //   }
  //   loadAdminUser();
  // }, []);

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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithStats | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventWithStats | null>(null);
  const [receptionEvent, setReceptionEvent] = useState<EventWithStats | null>(null);

  // Vouchers search & filter (used in detail view)
  const [voucherSearch, setVoucherSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'redeemed' | 'pending'>('all');

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

  // Active event for Detail/Live Monitor
  const currentEvent = useMemo(() => {
    if (!selectedEventSlug) return null;
    return events.find((e) => e.event_slug === selectedEventSlug) || null;
  }, [events, selectedEventSlug]);

  // Live countdown timer state
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute countdown string for selected event
  const countdownDisplay = useMemo(() => {
    if (!currentEvent) return { text: '00:00:00', label: 'Selesai', status: 'ended' };

    const start = new Date(currentEvent.start_time).getTime();
    const end = new Date(currentEvent.end_time).getTime();

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
      const diff = Math.max(0, Math.floor((end - nowTime) / 1000));
      return {
        text: formatDiff(diff),
        label: 'Sedang Berjalan',
        status: 'active',
      };
    }
  }, [currentEvent, nowTime]);

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

  const currentEventBadge = useMemo(() => {
    if (!currentEvent) return null;
    return getEventStatusBadge(currentEvent);
  }, [currentEvent, nowTime]);

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
    } finally {
      setIsRefreshing(false);
    }
  }

  // Quick Action: +1 Jam Overtime for specific event
  async function handleOvertime(slug: string) {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'overtime' }),
      });

      if (res.ok) {
        await refreshEvents();
      }
    } catch (e) {
      console.error('Overtime error', e);
    } finally {
      setActionLoading(false);
    }
  }

  // Quick Action: Toggle Status (Tutup/Buka Event)
  async function handleToggleStatus(slug: string) {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_status' }),
      });

      if (res.ok) {
        await refreshEvents();
      }
    } catch (e) {
      console.error('Toggle status error', e);
    } finally {
      setActionLoading(false);
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
      } else {
        alert(data.message || 'Gagal membuat event.');
      }
    } catch {
      alert('Terjadi kesalahan saat membuat event.');
    } finally {
      setActionLoading(false);
    }
  }

  // Open Edit Modal
  function openEditModal(event: EventWithStats) {
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
      } else {
        alert(data.message || 'Gagal memperbarui event.');
      }
    } catch {
      alert('Terjadi kesalahan saat menyimpan perubahan event.');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Delete Event
  async function handleConfirmDelete() {
    if (!deletingEvent || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/events/${deletingEvent.event_slug}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (selectedEventSlug === deletingEvent.event_slug) {
          setSelectedEventSlug(null);
        }
        setDeletingEvent(null);
        await refreshEvents();
      } else {
        alert(data.message || 'Gagal menghapus event.');
      }
    } catch {
      alert('Terjadi kesalahan saat menghapus event.');
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
    if (!currentEvent || !currentEvent.vouchers) return [];
    return currentEvent.vouchers.filter((v: Voucher) => {
      const matchToken = v.token.toLowerCase().includes(voucherSearch.toLowerCase());
      if (statusFilter === 'redeemed') return matchToken && v.is_redeemed;
      if (statusFilter === 'pending') return matchToken && !v.is_redeemed;
      return matchToken;
    });
  }, [currentEvent, voucherSearch, statusFilter]);

  // Host origin for links & QR
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const guestClaimUrl = currentEvent ? `${appOrigin}/e/${currentEvent.event_slug}` : '';
  const crewScannerUrl = currentEvent ? `${appOrigin}/scanner/${currentEvent.event_slug}` : '';

  return (
    <div className="min-h-screen bg-[#f1f3f6] text-slate-900 flex flex-col selection:bg-[#D30000] selection:text-white">
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
            className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center transition-all shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D30000]' : ''}`} />
          </button>

          <button
            onClick={handleLogout}
            aria-label="Keluar akun"
            className="w-10 h-10 rounded-xl bg-white hover:bg-red-100 text-slate-600 hover:text-[#D30000] active:scale-95 flex items-center justify-center transition-all shadow-xs"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex-1 space-y-4 sm:space-y-5">
        {/* ============================================================ */}
        {/* VIEW 1: DAFTAR EVENT (HALAMAN UTAMA) */}
        {/* ============================================================ */}
        {!selectedEventSlug && (
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
                className="w-full h-12 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10 active:scale-[0.99] transition-all"
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
                    <button
                      onClick={() => setSelectedEventSlug(activeEvent.event_slug)}
                      aria-label="Buka detail event aktif"
                      className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                      title="Lihat Detail"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
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
                            })} ({new Date(ev.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} - {new Date(ev.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')})
                          </span> |
                          <span className="inline-flex items-center text-xs font-medium text-slate-600">
                            {ev.stats.total_redeemed}/{ev.quota} kuota
                          </span>
                        </div>
                      </div>

                      {/* Right: 3 Action Buttons - Detail (ArrowUpRight), Edit (Pencil), Hapus (Trash) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* 1. Detail Button (Hijau) */}
                        <button
                          onClick={() => setSelectedEventSlug(ev.event_slug)}
                          aria-label={`Buka detail event ${ev.event_name}`}
                          className="w-9 h-9 rounded-xl hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs border border-emerald-200"
                          title="Detail & Live Monitor"
                        >
                          <ArrowUpRight className="w-4 h-4 stroke-[2.3]" />
                        </button>

                        {/* 2. Edit Button (Kuning) */}
                        <button
                          onClick={() => openEditModal(ev)}
                          aria-label={`Edit event ${ev.event_name}`}
                          className="w-9 h-9 rounded-xl hover:bg-amber-500 text-amber-600 hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs border border-amber-200"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4 stroke-[2.2]" />
                        </button>

                        {/* 3. Hapus Button (Merah) */}
                        <button
                          onClick={() => setDeletingEvent(ev)}
                          aria-label={`Hapus event ${ev.event_name}`}
                          className="w-9 h-9 rounded-xl hover:bg-red-500 text-red-600 hover:text-white flex items-center justify-center transition-colors active:scale-95 shadow-xs border border-red-200"
                          title="Hapus Event"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: DETAIL / LIVE MONITOR (KHUSUS EVENT TERPILIH) */}
        {/* ============================================================ */}
        {selectedEventSlug && currentEvent && (
          <div className="space-y-3">
            {/* Top Navigation Row: Back to events on left, Status Badge on right */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedEventSlug(null)}
                aria-label="Kembali ke Daftar Event"
                title="Kembali ke Daftar Event"
                className="h-10 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs flex items-center gap-2 text-xs font-bold transition-all active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                <span>Back to events</span>
              </button>

              {currentEventBadge && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border shadow-xs ${currentEventBadge.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentEventBadge.dot}`} />
                  <span>{currentEventBadge.label}</span>
                </span>
              )}
            </div>

            {/* Event Detail Hero Card - matching Dashboard Hero Card layout */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-100 flex flex-col gap-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                  {currentEvent.event_name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  {new Date(currentEvent.start_time).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  ({new Date(currentEvent.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} -{' '}
                  {new Date(currentEvent.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')} WIB)
                </p>
              </div>

              {/* Main Action Button: Tombol Scanner (matching + Tambah Event red pill) */}
              <a
                href={crewScannerUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full h-12 bg-[#D30000] hover:bg-[#b80000] active:bg-[#9e0000] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-red-600/10 active:scale-[0.99] transition-all"
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
                  className="h-10 px-3 rounded-xl bg--50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Ticket className="w-3.5 h-3.5 text-red-600" />
                  <span>Buka Tiket Tamu</span>
                </a>

                <button
                  onClick={() => setReceptionEvent(currentEvent)}
                  className="h-10 px-3 rounded-xl bg-slate-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Meja Resepsionis</span>
                </button>
              </div>
            </div>

            {/* Metric Cards Grid - Simplified & Clean */}
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
                      {currentEvent.stats.total_claimed}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      / {currentEvent.stats.buffer_limit} tiket
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
                          (currentEvent.stats.total_claimed / currentEvent.stats.buffer_limit) * 100
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
                      {currentEvent.stats.total_redeemed}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      / {currentEvent.quota} sesi
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
                          (currentEvent.stats.total_redeemed / currentEvent.quota) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Metric 3: Countdown Waktu */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-red-500" />
                      Countdown
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                      {countdownDisplay.text}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Berakhir:{' '}
                    {new Date(currentEvent.end_time).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).replace('.', ':')}{' '}
                    WIB
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Aksi Cepat Manajemen Acara</h3>
                  <p className="text-xs text-slate-500">
                    Kontrol instan overtime dan status aktif photobooth di lapangan.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleOvertime(currentEvent.event_slug)}
                  disabled={actionLoading}
                  className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Clock className="w-4 h-4" />
                  <span>+1 Jam Overtime</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(currentEvent.event_slug)}
                  disabled={actionLoading}
                  className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border ${currentEvent.is_active
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                    }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{currentEvent.is_active ? 'Tutup Event' : 'Buka Kembali Event'}</span>
                </button>
              </div>
            </div>

            {/* Vouchers Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daftar Voucher Diterbitkan ({filteredVouchers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Semua token voucher tamu untuk event {currentEvent.event_name}.
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
                      className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'all'
                        ? 'bg-white shadow-xs text-slate-900'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setStatusFilter('redeemed')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'redeemed'
                        ? 'bg-white shadow-xs text-emerald-700'
                        : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                      Ditukarkan
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-2.5 py-1 rounded-md font-semibold ${statusFilter === 'pending'
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
                              className={`px-2.5 py-1 rounded-full font-semibold ${v.is_redeemed
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
        )}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors"
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors"
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
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">Hapus Event?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus event{' '}
              <strong className="text-slate-900 font-bold">"{deletingEvent.event_name}"</strong>? Seluruh
              data tiket dan riwayat penukaran yang berkaitan akan dihapus secara permanen.
            </p>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: QR MEJA RESEPSIONIS */}
      {/* ============================================================ */}
      {receptionEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setReceptionEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
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
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kartu Meja</span>
              </button>
              <button
                onClick={() => setReceptionEvent(null)}
                className="px-4 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
