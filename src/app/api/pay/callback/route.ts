import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

// Safaricom calls this URL after the customer enters (or cancels) the M-Pesa PIN.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!process.env.MPESA_CALLBACK_SECRET || token !== process.env.MPESA_CALLBACK_SECRET)
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const cb = body?.Body?.stkCallback;
    if (!cb) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Ignored' });

    const db = adminClient();
    const { data: payment } = await db.from('payments').select('*')
      .eq('checkout_request_id', cb.CheckoutRequestID).single();
    if (!payment || payment.status === 'paid') return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });

    if (cb.ResultCode !== 0) {
      await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Recorded' });
    }

    const items: { Name: string; Value?: any }[] = cb.CallbackMetadata?.Item || [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    if (Number(get('Amount')) < payment.amount) {
      await db.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Amount mismatch' });
    }
    await db.from('payments').update({ status: 'paid', mpesa_receipt: String(get('MpesaReceiptNumber') || '') }).eq('id', payment.id);
    await db.from('bookings').update(payment.kind === 'balance' ? { balance_paid: true } : { deposit_paid: true }).eq('id', payment.booking_id);
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
