import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabase-admin';
import { mpesaConfigured, stkPush } from '@/lib/mpesa';
import { normalizeKePhone } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const { bookingId, phone } = await req.json();
    const msisdn = normalizeKePhone(String(phone || ''));
    if (!msisdn) return NextResponse.json({ error: 'Enter a valid M-Pesa number, e.g. 0712 345 678.' }, { status: 400 });

    const db = adminClient();
    const { data: booking } = await db.from('bookings').select('*').eq('id', bookingId).single();
    if (!booking || booking.customer_id !== user.id)
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    if (booking.deposit_paid)
      return NextResponse.json({ error: 'Deposit already paid.' }, { status: 400 });
    if (booking.status === 'cancelled')
      return NextResponse.json({ error: 'This booking was cancelled.' }, { status: 400 });

    const { data: payment, error } = await db.from('payments').insert({
      booking_id: booking.id, customer_id: user.id, amount: booking.deposit_amount, phone: msisdn,
    }).select().single();
    if (error || !payment) throw new Error('Could not start payment');

    if (!mpesaConfigured()) {
      // TEST MODE: no real money moves. The UI shows a "Simulate payment" button.
      return NextResponse.json({ mode: 'test', paymentId: payment.id });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const checkoutId = await stkPush({
      phone: msisdn, amount: booking.deposit_amount, reference: booking.reference,
      callbackUrl: `${site}/api/pay/callback?token=${process.env.MPESA_CALLBACK_SECRET}`,
    });
    await db.from('payments').update({ checkout_request_id: checkoutId }).eq('id', payment.id);
    return NextResponse.json({ mode: 'live', paymentId: payment.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Payment failed' }, { status: 500 });
  }
}
