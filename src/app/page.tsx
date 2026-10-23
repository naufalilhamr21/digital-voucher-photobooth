import { getAllEvents } from '@/lib/services/eventService';
import AdminDashboardView from './admin/AdminDashboardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manajemen Event | Alineas Studio Photobooth',
  description: 'Portal utama manajemen event photobooth dan penerbitan voucher digital Alineas Studio.',
};

export default async function HomePage() {
  const events = await getAllEvents();
  return <AdminDashboardView initialEvents={events} />;
}
