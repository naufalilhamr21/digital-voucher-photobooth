import { redirect } from 'next/navigation';
import { getAllEvents } from '@/lib/services/eventService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminDashboardView from './AdminDashboardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Alineas Studio Photobooth',
  description: 'Monitoring langsung kuota, waktu, dan penukaran voucher photobooth Alineas Studio.',
};

export default async function AdminPage() {
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

  const events = await getAllEvents();
  return <AdminDashboardView initialEvents={events} />;
}
