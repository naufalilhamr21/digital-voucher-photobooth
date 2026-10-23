import { NextResponse } from 'next/server';
import {
  deleteEvent,
  extendEventOvertime,
  getEventBySlug,
  toggleEventStatus,
  updateEvent,
} from '@/lib/services/eventService';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error fetching event by slug:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat event.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, pin, event_name, quota, start_time, duration_hours, pin_code } = body;

    // Action: edit event details
    if (action === 'edit') {
      const updated = await updateEvent(event.id, {
        event_name,
        quota,
        start_time,
        duration_hours,
        pin_code,
      });

      return NextResponse.json({
        success: true,
        message: 'Data event berhasil diperbarui.',
        event: updated,
      });
    }

    // Action: verify PIN for crew scanner
    if (action === 'verify_pin') {
      const isMatch = (event.pin_code || '1234') === pin?.trim();
      return NextResponse.json({
        success: isMatch,
        message: isMatch ? 'PIN benar.' : 'PIN salah. Silakan coba lagi.',
      });
    }

    // Action: Overtime (+1 jam)
    if (action === 'overtime') {
      const updated = await extendEventOvertime(event.id, 1);
      return NextResponse.json({
        success: true,
        message: 'Waktu event berhasil ditambah 1 jam overtime!',
        event: updated,
      });
    }

    // Action: Toggle active status (Tutup / Buka Event)
    if (action === 'toggle_status') {
      const updated = await toggleEventStatus(event.id);
      return NextResponse.json({
        success: true,
        message: updated?.is_active ? 'Event berhasil diaktifkan kembali.' : 'Event telah ditutup.',
        event: updated,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Aksi tidak dikenali.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses perubahan event.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const event = await getEventBySlug(slug);

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event tidak ditemukan.' },
        { status: 404 }
      );
    }

    const deleted = await deleteEvent(event.id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Gagal menghapus event dari database.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event berhasil dihapus.',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat menghapus event.' },
      { status: 500 }
    );
  }
}
