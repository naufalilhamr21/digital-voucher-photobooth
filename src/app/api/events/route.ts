import { NextResponse } from 'next/server';
import { createEvent, getAllEvents } from '@/lib/services/eventService';

export async function GET() {
  try {
    const events = await getAllEvents();
    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data event.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_name, event_slug, quota, start_time, duration_hours, pin_code } = body;

    if (!event_name || !event_slug || !quota || !start_time || !duration_hours) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi.' },
        { status: 400 }
      );
    }

    const event = await createEvent({
      event_name,
      event_slug,
      quota: parseInt(quota, 10),
      start_time,
      duration_hours: parseInt(duration_hours, 10),
      pin_code: pin_code || '1234',
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat event baru.' },
      { status: 500 }
    );
  }
}
