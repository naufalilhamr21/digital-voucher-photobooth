import { Event, Voucher } from '@/lib/types';

// Initial demo event matching schema.sql
const demoStartTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // started 30 mins ago
const demoEndTime = new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(); // ends in 3.5 hours

export const globalStore = {
  events: [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      event_name: 'The Wedding of Sarah & Dimas',
      event_slug: 'sarah-dimas',
      quota: 150,
      start_time: demoStartTime,
      end_time: demoEndTime,
      duration_hours: 4,
      is_active: true,
      pin_code: '8821',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'e1000000-0000-0000-0000-000000000002',
      event_name: 'Alineas Gala Night 2026',
      event_slug: 'alineas-gala',
      quota: 100,
      start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      duration_hours: 4,
      is_active: true,
      pin_code: '1234',
      created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
  ] as Event[],

  vouchers: [
    {
      id: 'v1000000-0000-0000-0000-000000000001',
      event_id: 'e1000000-0000-0000-0000-000000000001',
      token: 'T9K2WP',
      is_redeemed: false,
      redeemed_at: null,
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    },
    {
      id: 'v1000000-0000-0000-0000-000000000002',
      event_id: 'e1000000-0000-0000-0000-000000000001',
      token: 'A4M8X2',
      is_redeemed: true,
      redeemed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
  ] as Voucher[],
};
