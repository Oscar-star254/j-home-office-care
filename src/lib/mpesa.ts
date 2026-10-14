const base = () =>
  process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

export const mpesaConfigured = () =>
  !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_PASSKEY && process.env.MPESA_SHORTCODE);

async function token() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }, cache: 'no-store',
  });
  if (!r.ok) throw new Error('M-Pesa authentication failed');
  return (await r.json()).access_token as string;
}

export async function stkPush(opts: { phone: string; amount: number; reference: string; callbackUrl: string }) {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const password = Buffer.from(shortcode + process.env.MPESA_PASSKEY + timestamp).toString('base64');
  const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode, Password: password, Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', Amount: opts.amount,
      PartyA: opts.phone, PartyB: shortcode, PhoneNumber: opts.phone,
      CallBackURL: opts.callbackUrl, AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: 'J Home deposit',
    }),
  });
  const j = await r.json();
  if (j.ResponseCode !== '0') throw new Error(j.errorMessage || j.ResponseDescription || 'STK push failed');
  return j.CheckoutRequestID as string;
}
