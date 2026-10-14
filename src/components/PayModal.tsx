'use client';
import { useEffect, useRef, useState } from 'react';
import { Smartphone, CheckCircle2, FlaskConical } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Modal } from './ui';
import { ksh, normalizeKePhone } from '@/lib/utils';

export function PayModal({ open, onClose, bookingId, kind, amount, total, defaultPhone, onPaid }: {
  open: boolean; onClose: () => void; bookingId: string; kind: 'deposit' | 'balance';
  amount: number; total: number; defaultPhone?: string | null; onPaid: () => void;
}) {
  const [phone, setPhone] = useState(defaultPhone ? '0' + defaultPhone.replace(/^254/, '') : '');
  const [stage, setStage] = useState<'form' | 'waiting' | 'test' | 'done'>('form');
  const [paymentId, setPaymentId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);
  const isBalance = kind === 'balance';

  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { if (open) { setStage('form'); setErr(''); } }, [open]);

  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const finish = () => { setStage('done'); onPaid(); };

  const poll = () => {
    let tries = 0;
    clearInterval(timer.current);
    timer.current = setInterval(async () => {
      tries++;
      const { data } = await supabase.from('bookings').select('deposit_paid, balance_paid').eq('id', bookingId).single();
      const paid = isBalance ? data?.balance_paid : data?.deposit_paid;
      if (paid) { clearInterval(timer.current); finish(); }
      else if (tries > 40) { clearInterval(timer.current); setStage('form'); setErr('We did not receive the payment. If money was deducted, it will reflect shortly — otherwise try again.'); }
    }, 3000);
  };

  const start = async () => {
    setErr('');
    if (!normalizeKePhone(phone)) return setErr('Enter a valid M-Pesa number, e.g. 0712 345 678.');
    setBusy(true);
    try {
      const r = await fetch('/api/pay/stk', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ bookingId, phone, kind }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.mode === 'none') return finish();
      setPaymentId(j.paymentId);
      if (j.mode === 'test') setStage('test'); else { setStage('waiting'); poll(); }
    } catch (e: any) { setErr(e.message || 'Could not start payment.'); }
    setBusy(false);
  };

  const simulate = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/pay/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ paymentId }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      finish();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={isBalance ? 'Pay remaining balance' : 'Pay booking deposit'}>
      {stage === 'done' ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
          <p className="mt-3 font-display text-2xl">{isBalance ? 'Payment complete!' : 'Deposit received!'}</p>
          <p className="mt-1 text-forest-500">{isBalance ? 'Your receipt is printing now.' : 'Chat with your provider is now unlocked.'}</p>
          <button className="btn-primary mt-5" onClick={onClose}>{isBalance ? 'Print my receipt' : 'Continue'}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-forest p-5 text-center text-white">
            <p className="text-sm text-white/70">{isBalance ? 'Balance due now' : 'Deposit due now'}</p>
            <p className="font-display text-5xl text-gold">{ksh(amount)}</p>
            <p className="mt-1 text-xs text-white/70">
              {isBalance ? `Service total ${ksh(total)} — deposit already paid` : total >= 1000 ? '10% of the service price' : 'Flat deposit for services below KSh 1,000'}
            </p>
          </div>
          {stage === 'form' && (
            <>
              <div><label className="label">M-Pesa phone number</label>
                <div className="relative"><Smartphone className="absolute left-3 top-3 h-5 w-5 text-forest-300" />
                  <input className="input pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" inputMode="tel" /></div></div>
              <button className="btn-gold w-full" onClick={start} disabled={busy}>{busy ? 'Sending request…' : `Pay ${ksh(amount)} with M-Pesa`}</button>
            </>
          )}
          {stage === 'waiting' && <Alert kind="info">Check your phone and enter your M-Pesa PIN to complete the payment. This window updates automatically.</Alert>}
          {stage === 'test' && (
            <>
              <Alert kind="info"><FlaskConical className="mr-1 inline h-4 w-4" />Test mode: M-Pesa is not connected yet, so no real money moves. Tap below to simulate a successful payment.</Alert>
              <button className="btn-primary w-full" onClick={simulate} disabled={busy}>Simulate successful payment</button>
            </>
          )}
          {err && <Alert>{err}</Alert>}
        </div>
      )}
    </Modal>
  );
}
