import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabase-admin';
import { mpesaConfigured, stkPush } from '@/lib/mpesa';
import { normalizeKePhone } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const user = await userFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

    const { bookingId, phone, kind: rawKind } = await req.json();
    const kind: 'deposit' | 'balance' = rawKind === 'balance' ? 'balance' : 'deposit';
    const msisdn = normalizeKePhone(String(phone || ''));
    if (!msisdn) return NextResponse.json({ error: 'Enter a valid M-Pesa number, e.g. 0712 345 678.' }, { status: 400 });

    const db = adminClient();
    const { data: booking, error: bErr } = await db.from('bookings').select('*').eq('id', bookingId).single();
    if (bErr && !booking) console.error('booking lookup failed', bErr);
    if (!booking || booking.customer_id !== user.id)
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });

    let amount: number;
    if (kind === 'deposit') {
      if (booking.deposit_paid) return NextResponse.json({ error: 'Deposit already paid.' }, { status: 400 });
      if (booking.status === 'cancelled') return NextResponse.json({ error: 'This booking was cancelled.' }, { status: 400 });
      amount = booking.deposit_amount;
    } else {
      if (!booking.deposit_paid) return NextResponse.json({ error: 'Please pay the deposit first.' }, { status: 400 });
      if (booking.status !== 'completed')
        return NextResponse.json({ error: 'The balance can be paid once your provider marks the job complete.' }, { status: 400 });
      if (booking.balance_paid) return NextResponse.json({ error: 'Balance already paid.' }, { status: 400 });
      amount = Math.max(booking.estimated_price - booking.deposit_amount, 0);
      if (amount === 0) {
        await db.from('bookings').update({ balance_paid: true }).eq('id', booking.id);
        return NextResponse.json({ mode: 'none' });
      }
    }

    let { data: payment, error } = await db.from('payments').insert({
      booking_id: booking.id, customer_id: user.id, amount, phone: msisdn, kind,
    }).select().single();

    // Database not updated with migration-002 yet (no "kind" column): a deposit can still go through.
    if (error && /kind/i.test(error.message) && kind === 'deposit') {
      ({ data: payment, error } = await db.from('payments').insert({
        booking_id: booking.id, customer_id: user.id, amount, phone: msisdn,
      }).select().single());
    }
    if (error || !payment) {
      console.error('payments insert failed', error);
      const m = error?.message || 'unknown error';
      let hint = '';
      if (/row-level security|permission denied|violates row-level/i.test(m)) hint = ' Check that SUPABASE_SERVICE_ROLE_KEY in Vercel is the service_role (secret) key, not the anon key, then redeploy.';
      else if (/kind/i.test(m)) hint = ' Run supabase/migration-002-receipts.sql in the Supabase SQL editor.';
      else if (/jwt|api key|invalid/i.test(m)) hint = ' The Supabase keys in Vercel look wrong. Re-enter them and redeploy.';
      throw new Error(`Could not start payment: ${m}.${hint}`);
    }

    if (!mpesaConfigured()) {
      // TEST MODE: no real money moves. The UI shows a "Simulate payment" button.
      return NextResponse.json({ mode: 'test', paymentId: payment.id });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const checkoutId = await stkPush({
      phone: msisdn, amount, reference: booking.reference,
      callbackUrl: `${site}/api/pay/callback?token=${process.env.MPESA_CALLBACK_SECRET}`,
    });
    await db.from('payments').update({ checkout_request_id: checkoutId }).eq('id', payment.id);
    return NextResponse.json({ mode: 'live', paymentId: payment.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Payment failed' }, { status: 500 });
  }
}
