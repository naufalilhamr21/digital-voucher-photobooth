import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Event, EventStats, EventWithStats, Voucher } from '@/lib/types';
import { globalStore } from './inMemoryStore';

// In-memory pause timestamps tracker (fallback and precise duration tracker)
const pauseTimestamps: Record<string, number> = {};

export function calculateEventStats(event: Event, vouchers: Voucher[]): EventStats {
  const total_claimed = vouchers.length;
  const buffer_limit = event.quota + 20; // 15% - 20% buffer limit
  const total_redeemed = vouchers.filter((v) => v.is_redeemed).length;
  const remaining_quota = Math.max(0, event.quota - total_redeemed);

  const now = Date.now();
  const startTime = new Date(event.start_time).getTime();
  const endTime = new Date(event.end_time).getTime();

  let time_status: 'upcoming' | 'active' | 'ended' = 'active';
  let seconds_left = 0;

  if (now < startTime) {
    time_status = 'upcoming';
    seconds_left = Math.max(0, Math.floor((startTime - now) / 1000));
  } else if (now > endTime) {
    time_status = 'ended';
    seconds_left = 0;
  } else {
    time_status = 'active';
    seconds_left = Math.max(0, Math.floor((endTime - now) / 1000));
  }

  return {
    total_claimed,
    buffer_limit,
    total_redeemed,
    remaining_quota,
    time_status,
    seconds_left,
  };
}

export async function getAllEvents(): Promise<EventWithStats[]> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && events) {
      const { data: vouchers } = await supabase.from('vouchers').select('*');
      const allVouchers = vouchers || [];

      return events.map((event) => {
        const eventVouchers = allVouchers.filter((v) => v.event_id === event.id);
        return {
          ...event,
          stats: calculateEventStats(event, eventVouchers),
          vouchers: eventVouchers,
        };
      });
    }
  }

  // Fallback to in-memory store
  return globalStore.events.map((event) => {
    const eventVouchers = globalStore.vouchers.filter((v) => v.event_id === event.id);
    return {
      ...event,
      stats: calculateEventStats(event, eventVouchers),
      vouchers: eventVouchers,
    };
  });
}

export async function getEventBySlug(slug: string): Promise<EventWithStats | null> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_slug', slug)
      .maybeSingle();

    if (!error && event) {
      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('*')
        .eq('event_id', event.id);

      const eventVouchers = vouchers || [];
      return {
        ...event,
        stats: calculateEventStats(event, eventVouchers),
        vouchers: eventVouchers,
      };
    }
  }

  // Fallback to in-memory store
  const event = globalStore.events.find((e) => e.event_slug === slug);
  if (!event) return null;

  const eventVouchers = globalStore.vouchers.filter((v) => v.event_id === event.id);
  return {
    ...event,
    stats: calculateEventStats(event, eventVouchers),
    vouchers: eventVouchers,
  };
}

export async function createEvent(data: {
  event_name: string;
  event_slug: string;
  quota: number;
  start_time: string;
  duration_hours: number;
  pin_code?: string;
}): Promise<Event> {
  const startDate = new Date(data.start_time);
  const endDate = new Date(startDate.getTime() + data.duration_hours * 60 * 60 * 1000);

  const newEvent: Event = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `e-${Date.now()}`,
    event_name: data.event_name,
    event_slug: data.event_slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'),
    quota: Number(data.quota),
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    duration_hours: Number(data.duration_hours),
    is_active: true,
    pin_code: data.pin_code?.trim() || '1234',
    created_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase
      .from('events')
      .insert([newEvent])
      .select()
      .single();

    if (!error && inserted) {
      return inserted;
    }
  }

  // Add to fallback in-memory store
  globalStore.events.unshift(newEvent);
  return newEvent;
}

export async function updateEvent(
  eventId: string,
  data: {
    event_name?: string;
    quota?: number;
    start_time?: string;
    duration_hours?: number;
    pin_code?: string;
  }
): Promise<Event | null> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const updatePayload: Record<string, any> = {};
    if (data.event_name) updatePayload.event_name = data.event_name;
    if (data.quota !== undefined) updatePayload.quota = Number(data.quota);
    if (data.pin_code) updatePayload.pin_code = data.pin_code;

    if (data.start_time && data.duration_hours !== undefined) {
      const start = new Date(data.start_time);
      const end = new Date(start.getTime() + Number(data.duration_hours) * 60 * 60 * 1000);
      updatePayload.start_time = start.toISOString();
      updatePayload.duration_hours = Number(data.duration_hours);
      updatePayload.end_time = end.toISOString();
    }

    const { data: updated, error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId)
      .select()
      .single();

    if (!error && updated) {
      return updated;
    }
  }

  // Fallback in-memory
  const target = globalStore.events.find((e) => e.id === eventId);
  if (!target) return null;

  if (data.event_name) target.event_name = data.event_name;
  if (data.quota !== undefined) target.quota = Number(data.quota);
  if (data.pin_code) target.pin_code = data.pin_code;

  if (data.start_time && data.duration_hours !== undefined) {
    const start = new Date(data.start_time);
    const end = new Date(start.getTime() + Number(data.duration_hours) * 60 * 60 * 1000);
    target.start_time = start.toISOString();
    target.duration_hours = Number(data.duration_hours);
    target.end_time = end.toISOString();
  }

  return target;
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (!error) return true;
  }

  // Fallback in-memory
  const index = globalStore.events.findIndex((e) => e.id === eventId);
  if (index !== -1) {
    globalStore.events.splice(index, 1);
    // Remove cascade vouchers
    globalStore.vouchers = globalStore.vouchers.filter((v) => v.event_id !== eventId);
    return true;
  }

  return false;
}

export async function extendEventOvertime(eventId: string, additionalHours: number = 1): Promise<Event | null> {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    const { data: current } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (current) {
      const currentEnd = new Date(current.end_time);
      const newEndTime = new Date(currentEnd.getTime() + additionalHours * 60 * 60 * 1000).toISOString();
      const newDuration = (current.duration_hours || 0) + additionalHours;

      const { data: updated, error } = await supabase
        .from('events')
        .update({
          end_time: newEndTime,
          duration_hours: newDuration,
          is_active: true,
        })
        .eq('id', eventId)
        .select()
        .single();

      if (!error && updated) return updated;
    }
  }

  // Fallback in-memory
  const target = globalStore.events.find((e) => e.id === eventId);
  if (!target) return null;

  const currentEnd = new Date(target.end_time);
  target.end_time = new Date(currentEnd.getTime() + additionalHours * 60 * 60 * 1000).toISOString();
  target.duration_hours += additionalHours;
  target.is_active = true;
  return target;
}

export async function toggleEventStatus(eventId: string, forceActive?: boolean): Promise<Event | null> {
  const supabase = await createServerSupabaseClient();
  const now = Date.now();

  if (supabase) {
    const { data: current, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchErr) {
      console.error('Error fetching event for toggle:', fetchErr);
    }

    if (current) {
      const newStatus = forceActive !== undefined ? forceActive : !current.is_active;

      if (!newStatus) {
        // 1. Action: JEDA (PAUSE)
        pauseTimestamps[eventId] = now;
        const pauseIso = new Date(now).toISOString();

        // Try updating with paused_at column first
        const { data: updatedWithPause, error: pauseErr } = await supabase
          .from('events')
          .update({ is_active: false, paused_at: pauseIso })
          .eq('id', eventId)
          .select()
          .single();

        if (!pauseErr && updatedWithPause) return updatedWithPause;

        // Fallback update without paused_at if column does not exist
        const { data: updatedBasic, error: basicErr } = await supabase
          .from('events')
          .update({ is_active: false })
          .eq('id', eventId)
          .select()
          .single();

        if (basicErr) {
          console.error('Error pausing event in Supabase:', basicErr);
        }

        if (updatedBasic) return updatedBasic;
      } else {
        // 2. Action: LANJUTKAN (RESUME) -> Hitung jeda dan perpanjang end_time otomatis
        const pauseStart = current.paused_at
          ? new Date(current.paused_at).getTime()
          : pauseTimestamps[eventId];

        let newEndTime = current.end_time;

        if (pauseStart) {
          const pauseDurationMs = Math.max(0, now - pauseStart);
          if (pauseDurationMs >= 1000) {
            const currentEndMs = new Date(current.end_time).getTime();
            newEndTime = new Date(currentEndMs + pauseDurationMs).toISOString();
          }
        }

        // Try updating with paused_at: null and extended end_time
        // Note: duration_hours is INTEGER in DB schema, so end_time is extended without modifying duration_hours
        const { data: updatedWithResume, error: resumeErr } = await supabase
          .from('events')
          .update({
            is_active: true,
            end_time: newEndTime,
            paused_at: null,
          })
          .eq('id', eventId)
          .select()
          .single();

        if (!resumeErr && updatedWithResume) {
          delete pauseTimestamps[eventId];
          return updatedWithResume;
        }

        // Fallback update without paused_at (if paused_at column does not exist)
        const { data: updatedBasicResume, error: basicResumeErr } = await supabase
          .from('events')
          .update({
            is_active: true,
            end_time: newEndTime,
          })
          .eq('id', eventId)
          .select()
          .single();

        if (basicResumeErr) {
          console.error('Error resuming event in Supabase:', basicResumeErr);
        }

        if (updatedBasicResume) {
          delete pauseTimestamps[eventId];
          return updatedBasicResume;
        }
      }
    }
  }

  // Fallback in-memory store
  const target = globalStore.events.find((e) => e.id === eventId);
  if (!target) return null;

  const newStatus = forceActive !== undefined ? forceActive : !target.is_active;

  if (!newStatus) {
    target.is_active = false;
    target.paused_at = new Date(now).toISOString();
    pauseTimestamps[eventId] = now;
  } else {
    target.is_active = true;
    const pauseStart = target.paused_at
      ? new Date(target.paused_at).getTime()
      : pauseTimestamps[eventId];

    if (pauseStart) {
      const pauseDurationMs = Math.max(0, now - pauseStart);
      if (pauseDurationMs >= 1000) {
        target.end_time = new Date(new Date(target.end_time).getTime() + pauseDurationMs).toISOString();
      }
      target.paused_at = null;
      delete pauseTimestamps[eventId];
    }
  }

  return target;
}
