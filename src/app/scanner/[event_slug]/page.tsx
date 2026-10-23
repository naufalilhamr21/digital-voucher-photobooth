import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/services/eventService';
import CrewScannerView from './CrewScannerView';
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
      title: 'Scanner Tidak Ditemukan | Alineas Studio',
    };
  }

  return {
    title: `Scanner Kru: ${event.event_name} | Alineas Studio`,
    description: `Pemindai voucher photobooth kru lapangan untuk ${event.event_name}.`,
  };
}

export default async function CrewScannerPage({ params }: PageProps) {
  const { event_slug } = await params;
  const event = await getEventBySlug(event_slug);

  if (!event) {
    notFound();
  }

  return <CrewScannerView initialEvent={event} />;
}
