import { NextResponse } from 'next/server';
import { adminClient, userFromRequest } from '@/lib/supabase-admin';
import { mpesaConfigured } from '@/lib/mpesa';

// TEST MODE ONLY: lets you simulate a successful deposit when M-Pesa keys are not set.
export async function POST(req: Request) {
  if (mpesaConfigured())
    return NextResponse.json({ error: 'Not available when M-Pesa is live.' }, { status: 403 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });

  const { paymentId } = await req.json();
  const db = adminClient();
  const { data: payment } = await db.from('payments').select('*').eq('id', paymentId).single();
  if (!payment || payment.customer_id !== user.id)
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

  await db.from('payments').update({ status: 'paid', mpesa_receipt: 'TEST' + Date.now().toString(36).toUpperCase() }).eq('id', payment.id);
  await db.from('bookings').update({ deposit_paid: true }).eq('id', payment.booking_id);
  return NextResponse.json({ ok: true });
}
