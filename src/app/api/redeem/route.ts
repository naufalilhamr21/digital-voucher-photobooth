import { NextResponse } from 'next/server';
import { redeemVoucher } from '@/lib/services/voucherService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_slug, token } = body;

    if (!event_slug || !token) {
      return NextResponse.json(
        { status: 'invalid_token', message: 'Event dan kode voucher wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await redeemVoucher(event_slug, token);

    // Return appropriate HTTP status codes based on business logic
    if (result.status === 'success') {
      return NextResponse.json(result, { status: 200 });
    } else if (result.status === 'already_redeemed') {
      return NextResponse.json(result, { status: 409 }); // Conflict
    } else if (result.status === 'quota_full') {
      return NextResponse.json(result, { status: 429 }); // Quota exceeded
    } else if (result.status === 'event_ended' || result.status === 'event_not_started') {
      return NextResponse.json(result, { status: 403 }); // Forbidden by schedule
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error redeeming voucher:', error);
    return NextResponse.json(
      { status: 'error', message: 'Terjadi kesalahan sistem saat memproses penukaran voucher.' },
      { status: 500 }
    );
  }
}
