import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ClaimResult, RedemptionResult, Voucher } from '@/lib/types';
import { generateToken, normalizeToken } from '@/lib/utils/token';
import { getEventBySlug } from './eventService';
import { globalStore } from './inMemoryStore';

export async function claimVoucher(eventSlug: string): Promise<ClaimResult> {
  const event = await getEventBySlug(eventSlug);

  if (!event) {
    return {
      success: false,
      message: 'Event tidak ditemukan.',
    };
  }

  if (!event.is_active) {
    return {
      success: false,
      message: 'Event ini telah ditutup. Voucher tidak lagi dapat diklaim.',
    };
  }

  // Check buffer limit: total claimed cannot exceed quota + 20
  const maxAllowedClaims = event.quota + 20;
  if (event.stats.total_claimed >= maxAllowedClaims) {
    return {
      success: false,
      message: `Kuota klaim telah habis mencapai batas maksimal (${maxAllowedClaims} tiket).`,
    };
  }

  // Generate unique token
  let token = generateToken(6);
  let attempts = 0;
  const existingTokens = new Set(
    (event.vouchers || []).map((v) => v.token)
  );

  while (existingTokens.has(token) && attempts < 10) {
    token = generateToken(6);
    attempts++;
  }

  const newVoucher: Voucher = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}`,
    event_id: event.id,
    token,
    is_redeemed: false,
    redeemed_at: null,
    created_at: new Date().toISOString(),
  };

  const supabase = await createServerSupabaseClient();
  if (supabase) {
    const { data: inserted, error } = await supabase
      .from('vouchers')
      .insert([newVoucher])
      .select()
      .single();

    if (!error && inserted) {
      return {
        success: true,
        message: 'Voucher berhasil diklaim!',
        token: inserted.token,
        voucher: inserted,
        event,
      };
    }
  }

  // Fallback in-memory
  globalStore.vouchers.push(newVoucher);
  return {
    success: true,
    message: 'Voucher berhasil diklaim!',
    token: newVoucher.token,
    voucher: newVoucher,
    event,
  };
}

export async function redeemVoucher(eventSlug: string, rawToken: string): Promise<RedemptionResult> {
  const token = normalizeToken(rawToken);

  if (!token || token.length < 5) {
    return {
      status: 'invalid_token',
      message: 'Format token tidak valid. Masukkan 6 karakter kode voucher.',
    };
  }

  const event = await getEventBySlug(eventSlug);
  if (!event) {
    return {
      status: 'error',
      message: 'Event tidak ditemukan.',
    };
  }

  if (!event.is_active) {
    return {
      status: 'event_inactive',
      message: 'Event ini sedang non-aktif / ditutup oleh admin.',
    };
  }

  // 1. Time Validation
  const now = Date.now();
  const startTime = new Date(event.start_time).getTime();
  const endTime = new Date(event.end_time).getTime();

  if (now < startTime) {
    return {
      status: 'event_not_started',
      message: `Event belum dimulai. Jadwal mulai: ${new Date(event.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB.`,
    };
  }

  if (now > endTime) {
    return {
      status: 'event_ended',
      message: `Waktu event telah berakhir pada ${new Date(event.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB. Hubungi admin untuk penambahan jam overtime.`,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (supabase) {
    // Look up voucher in Supabase
    const { data: voucher, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('event_id', event.id)
      .eq('token', token)
      .maybeSingle();

    if (error || !voucher) {
      return {
        status: 'invalid_token',
        message: `Kode voucher "${token}" tidak terdaftar untuk event ini.`,
      };
    }

    // 2. Duplicate Check
    if (voucher.is_redeemed) {
      const redeemedTimeStr = voucher.redeemed_at
        ? new Date(voucher.redeemed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Sebelumnya';
      return {
        status: 'already_redeemed',
        message: `VOUCHER SUDAH PERNAH DIGUNAKAN! Ditukarkan pada ${redeemedTimeStr} WIB.`,
        voucher,
        redeemed_at: voucher.redeemed_at || undefined,
      };
    }

    // 3. Quota Exhaustion Check
    if (event.stats.total_redeemed >= event.quota) {
      return {
        status: 'quota_full',
        message: `Kuota penukaran voucher telah mencapai batas maksimal (${event.quota} voucher).`,
        voucher,
      };
    }

    // 4. Perform Redemption
    const redeemedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabase
      .from('vouchers')
      .update({
        is_redeemed: true,
        redeemed_at: redeemedAt,
      })
      .eq('id', voucher.id)
      .select()
      .single();

    if (updateErr || !updated) {
      return {
        status: 'error',
        message: 'Gagal memproses penukaran. Silakan coba kembali.',
      };
    }

    return {
      status: 'success',
      message: 'VOUCHER VALID & BERHASIL DITUKARKAN!',
      voucher: updated,
      event,
      redeemed_at: redeemedAt,
      total_redeemed: event.stats.total_redeemed + 1,
    };
  }

  // Fallback in-memory
  const voucher = globalStore.vouchers.find(
    (v) => v.event_id === event.id && v.token === token
  );

  if (!voucher) {
    return {
      status: 'invalid_token',
      message: `Kode voucher "${token}" tidak terdaftar untuk event ini.`,
    };
  }

  if (voucher.is_redeemed) {
    const redeemedTimeStr = voucher.redeemed_at
      ? new Date(voucher.redeemed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : 'Sebelumnya';
    return {
      status: 'already_redeemed',
      message: `VOUCHER SUDAH PERNAH DIGUNAKAN! Ditukarkan pada ${redeemedTimeStr} WIB.`,
      voucher,
      redeemed_at: voucher.redeemed_at || undefined,
    };
  }

  if (event.stats.total_redeemed >= event.quota) {
    return {
      status: 'quota_full',
      message: `Kuota penukaran voucher telah mencapai batas maksimal (${event.quota} voucher).`,
      voucher,
    };
  }

  voucher.is_redeemed = true;
  voucher.redeemed_at = new Date().toISOString();

  return {
    status: 'success',
    message: 'VOUCHER VALID & BERHASIL DITUKARKAN!',
    voucher,
    event,
    redeemed_at: voucher.redeemed_at,
    total_redeemed: event.stats.total_redeemed + 1,
  };
}
