export interface Event {
  id: string;
  event_name: string;
  event_slug: string;
  quota: number;
  start_time: string;
  end_time: string;
  duration_hours: number;
  is_active: boolean;
  pin_code: string;
  created_at: string;
}

export interface Voucher {
  id: string;
  event_id: string;
  token: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

export interface EventStats {
  total_claimed: number;
  buffer_limit: number;
  total_redeemed: number;
  remaining_quota: number;
  time_status: 'upcoming' | 'active' | 'ended';
  seconds_left: number;
}

export interface EventWithStats extends Event {
  stats: EventStats;
  vouchers?: Voucher[];
}

export type RedemptionStatus =
  | 'success'
  | 'already_redeemed'
  | 'quota_full'
  | 'event_ended'
  | 'event_not_started'
  | 'event_inactive'
  | 'invalid_token'
  | 'error';

export interface RedemptionResult {
  status: RedemptionStatus;
  message: string;
  voucher?: Voucher;
  event?: Event;
  redeemed_at?: string;
  total_redeemed?: number;
}

export interface ClaimResult {
  success: boolean;
  message: string;
  token?: string;
  voucher?: Voucher;
  event?: Event;
}
