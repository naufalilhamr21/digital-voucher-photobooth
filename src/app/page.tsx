import { redirect } from 'next/navigation';
import { getAllEvents } from '@/lib/services/eventService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminDashboardView from './admin/AdminDashboardView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manajemen Event | Alineas Studio Photobooth',
  description: 'Portal utama manajemen event photobooth dan penerbitan voucher digital Alineas Studio.',
};

export default async function HomePage() {
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
