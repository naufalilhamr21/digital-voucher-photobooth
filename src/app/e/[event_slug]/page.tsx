import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/services/eventService';
import GuestClaimView from './GuestClaimView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ event_slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { event_slug } = await params;
  const event = await getEventBySlug(event_slug);

  if (!event) {
    return {
      title: 'Event Tidak Ditemukan | Alineas Studio',
    };
  }

  return {
    title: `Tiket Photobooth: ${event.event_name} | Alineas Studio`,
    description: `Klaim voucher photobooth digital untuk ${event.event_name} di Alineas Studio.`,
  };
}

export default async function GuestClaimPage({ params }: PageProps) {
  const { event_slug } = await params;
  const event = await getEventBySlug(event_slug);

  if (!event) {
    notFound();
  }

  return <GuestClaimView initialEvent={event} />;
}
