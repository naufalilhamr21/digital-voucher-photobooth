import { notFound, redirect } from 'next/navigation';
import { getEventBySlug } from '@/lib/services/eventService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import EventDetailView from './EventDetailView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event
      ? `${event.event_name} | Live Monitor Alineas`
      : 'Event Detail | Alineas Studio Photobooth',
    description: event
      ? `Live monitoring kuota, tiket, dan penukaran photobooth untuk event ${event.event_name}.`
      : 'Detail event photobooth Alineas Studio.',
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect('/login');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return <EventDetailView initialEvent={event} />;
}

