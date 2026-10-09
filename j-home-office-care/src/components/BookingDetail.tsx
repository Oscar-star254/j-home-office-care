'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, CalendarDays, Phone, CheckCircle2, XCircle, Play, Flag, Star, Wallet, Ban } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Alert, Spinner, Stars } from './ui';
import { Chat } from './Chat';
import { PayModal } from './PayModal';
import { ksh, statusMeta, unitLabel } from '@/lib/utils';
import type { Booking } from '@/lib/types';

type Party = { id: string; full_name: string; avatar_url: string | null; phone: string | null } | null;

export function BookingDetail({ id, role, backHref }: { id: string; role: 'customer' | 'employee' | 'admin'; backHref: string }) {
  const { profile } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const [b, setB] = useState<Booking | null>(null);
  const [other, setOther] = useState<Party>(null);
  const [review, setReview] = useState<{ rating: number; comment: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pay, setPay] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState(5);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('bookings').select('*, services(*)').eq('id', id).single();
    if (data) {
      if (role === 'admin') {
        const { data: ps } = await supabase.from('profiles').select('id, full_name, avatar_url, phone').in('id', [data.customer_id, data.employee_id]);
        (data as any)._parties = ps || [];
      } else {
        const { data: c } = await supabase.rpc('booking_counterpart', { bid: id });
        setOther((c as Party[])?.[0] ?? null);
      }
      const { data: r } = await supabase.from('reviews').select('rating, comment').eq('booking_id', id).maybeSingle();
      setReview(r);
    }
    setB(data as Booking | null);
    setLoading(false);
  }, [id, role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (b && role === 'customer' && sp.get('pay') && !b.deposit_paid) setPay(true); }, [b?.id]); // eslint-disable-line

  useEffect(() => {
    const ch = supabase.channel('booking-' + id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  if (loading) return <Spinner />;
  if (!b) return <Alert>Booking not found.</Alert>;

  const setStatus = async (status: string, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true); setErr('');
    const { error } = await supabase.from('bookings').update({ status }).eq('id', b.id);
    setBusy(false);
    if (error) setErr(error.message); else load();
  };

  const submitReview = async () => {
    setBusy(true); setErr('');
    const { error } = await supabase.from('reviews').insert({ booking_id: b.id, customer_id: profile!.id, employee_id: b.employee_id, rating: rate, comment: comment.trim() || null });
    setBusy(false);
    if (error) setErr(error.message); else load();
  };

  const sm = statusMeta[b.status];
  const svc = b.services!;
  const parties: any[] = (b as any)._parties || [];
  const customerP = parties.find((p) => p.id === b.customer_id);
  const employeeP = parties.find((p) => p.id === b.employee_id);
  const label = role === 'customer' ? 'Your provider' : 'Customer';

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600"><ArrowLeft className="h-4 w-4" /> Back</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl uppercase text-forest md:text-4xl">{svc.name}{b.quantity > 1 && ` × ${b.quantity}`}</h1>
          <p className="text-forest-500">Reference <b>{b.reference}</b></p>
        </div>
        <span className={`badge text-sm ${sm.cls}`}>{sm.label}</span>
      </div>

      {err && <Alert>{err}</Alert>}

      {/* Deposit prompt */}
      {role === 'customer' && !b.deposit_paid && b.status !== 'cancelled' && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-gold bg-gold-50 p-5">
          <div className="flex items-center gap-3"><Wallet className="h-8 w-8 text-gold-700" />
            <div><p className="font-display text-xl uppercase">Pay your deposit to confirm</p><p className="text-sm text-forest-600">{ksh(b.deposit_amount)} unlocks chat and sends your request to the provider.</p></div></div>
          <button className="btn-gold" onClick={() => setPay(true)}>Pay {ksh(b.deposit_amount)}</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <h2 className="text-xl uppercase">Booking details</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gold-600" />{b.address}</p>
              <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-gold-600" />{b.scheduled_date} {b.scheduled_time}</p>
            </div>
            {Object.keys(b.details || {}).length > 0 && (
              <dl className="grid gap-x-6 gap-y-2 border-t border-gold/20 pt-3 text-sm sm:grid-cols-2">
                {Object.entries(b.details).map(([k, v]) => <div key={k}><dt className="text-forest-400">{k}</dt><dd className="font-semibold">{String(v)}</dd></div>)}
              </dl>
            )}
            {b.notes && <p className="rounded-xl bg-forest-50 p-3 text-sm"><b>Notes:</b> {b.notes}</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-xl uppercase">Payment</h2>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between"><span>Service price ({svc.price_note.toLowerCase()})</span><b>{ksh(b.estimated_price)} {unitLabel[svc.price_unit] && b.quantity > 1 ? '' : ''}</b></p>
              <p className="flex justify-between"><span>Deposit</span><b className={b.deposit_paid ? 'text-green-700' : 'text-gold-700'}>{ksh(b.deposit_amount)} · {b.deposit_paid ? 'Paid ✓' : 'Not paid'}</b></p>
              <p className="flex justify-between text-forest-500"><span>Balance after service</span><span>{ksh(Math.max(b.estimated_price - b.deposit_amount, 0))}</span></p>
            </div>
          </div>

          {/* provider actions */}
          {role === 'employee' && (
            <div className="card space-y-3 p-5">
              <h2 className="text-xl uppercase">Update job</h2>
              {!b.deposit_paid ? <p className="text-sm text-forest-500">Waiting for the customer to pay their deposit before you can respond.</p> : (
                <div className="flex flex-wrap gap-2">
                  {b.status === 'requested' && <><button disabled={busy} className="btn-primary" onClick={() => setStatus('accepted')}><CheckCircle2 className="h-4 w-4" />Accept job</button>
                    <button disabled={busy} className="btn-danger" onClick={() => setStatus('declined', 'Decline this job? The customer will be refunded.')}><XCircle className="h-4 w-4" />Decline</button></>}
                  {b.status === 'accepted' && <button disabled={busy} className="btn-primary" onClick={() => setStatus('in_progress')}><Play className="h-4 w-4" />Start job</button>}
                  {b.status === 'in_progress' && <button disabled={busy} className="btn-gold" onClick={() => setStatus('completed', 'Mark this job as completed?')}><Flag className="h-4 w-4" />Mark completed</button>}
                  {['completed', 'declined', 'cancelled', 'refund_due'].includes(b.status) && <p className="text-sm text-forest-500">No further actions.</p>}
                </div>
              )}
            </div>
          )}

          {role === 'customer' && ['awaiting_deposit', 'requested', 'accepted'].includes(b.status) && (
            <button disabled={busy} className="btn-ghost text-red-700" onClick={() => setStatus('cancelled', b.deposit_paid ? 'Cancel this booking? Your deposit will be flagged for refund.' : 'Cancel this booking?')}><Ban className="h-4 w-4" />Cancel booking</button>
          )}

          {role === 'admin' && (
            <div className="card space-y-3 p-5">
              <h2 className="text-xl uppercase">Admin controls</h2>
              <select className="input" value={b.status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              {!b.deposit_paid && <button className="btn-ghost" onClick={async () => { if (confirm('Mark deposit as paid manually?')) { await supabase.from('bookings').update({ deposit_paid: true }).eq('id', b.id); load(); } }}>Mark deposit paid manually</button>}
            </div>
          )}

          {/* review */}
          {role === 'customer' && b.status === 'completed' && (
            <div className="card space-y-3 p-5">
              <h2 className="text-xl uppercase">Rate your provider</h2>
              {review ? <><Stars value={review.rating} size="h-6 w-6" />{review.comment && <p className="text-sm">{review.comment}</p>}<p className="text-xs text-forest-400">Thanks for your review!</p></> : (
                <>
                  <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRate(n)} aria-label={`${n} stars`}><Star className={`h-9 w-9 ${n <= rate ? 'fill-gold text-gold' : 'text-gray-300'}`} /></button>)}</div>
                  <textarea className="input min-h-20" placeholder="How was the service? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button className="btn-primary" onClick={submitReview} disabled={busy}>Submit review</button>
                </>
              )}
            </div>
          )}
          {role !== 'customer' && review && <div className="card p-5"><h2 className="mb-2 text-xl uppercase">Customer review</h2><Stars value={review.rating} size="h-6 w-6" />{review.comment && <p className="mt-2 text-sm">{review.comment}</p>}</div>}
        </div>

        <div className="space-y-6">
          {role !== 'admin' && (
            <div className="card flex items-center gap-4 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {other?.avatar_url ? <img src={other.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-2xl font-bold text-gold">{other?.full_name?.[0] || '?'}</span>}
              <div className="min-w-0"><p className="text-xs uppercase text-forest-400">{label}</p><p className="font-display text-xl uppercase">{other?.full_name || '—'}</p>
                {other?.phone ? <a href={`tel:${other.phone}`} className="flex items-center gap-1 text-sm font-semibold text-gold-600"><Phone className="h-4 w-4" />+{other.phone}</a> : <p className="text-xs text-forest-400">Contact details unlock after the deposit</p>}</div>
            </div>
          )}
          {role === 'admin' && (
            <div className="card space-y-1 p-5 text-sm">
              <p><b>Customer:</b> {customerP?.full_name} · {customerP?.phone}</p>
              <p><b>Provider:</b> {employeeP?.full_name} · {employeeP?.phone}</p>
            </div>
          )}
          <Chat bookingId={b.id} meId={profile!.id} unlocked={b.deposit_paid} role={role} readOnly={role === 'admin'} onUnlock={() => setPay(true)} />
        </div>
      </div>

      {role === 'customer' && <PayModal open={pay} onClose={() => { setPay(false); router.replace(`/customer/bookings/${b.id}`); }} booking={b} defaultPhone={profile?.phone} onPaid={load} />}
    </div>
  );
}
