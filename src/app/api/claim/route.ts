import { NextResponse } from 'next/server';
import { claimVoucher } from '@/lib/services/voucherService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_slug } = body;

    if (!event_slug) {
      return NextResponse.json(
        { success: false, message: 'Slug event wajib disertakan.' },
        { status: 400 }
      );
    }

    const result = await claimVoucher(event_slug);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error claiming voucher:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan sistem saat memproses klaim voucher.' },
      { status: 500 }
    );
  }
}
