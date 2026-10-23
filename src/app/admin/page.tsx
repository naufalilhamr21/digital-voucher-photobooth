import { getAllEvents } from '@/lib/services/eventService';
import AdminDashboardView from './AdminDashboardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Alineas Studio Photobooth',
  description: 'Monitoring langsung kuota, waktu, dan penukaran voucher photobooth Alineas Studio.',
};

export default async function AdminPage() {
  const events = await getAllEvents();
  return <AdminDashboardView initialEvents={events} />;
}
