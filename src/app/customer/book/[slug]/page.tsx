'use client';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, MapPin, MessageCircle, ChevronDown, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Alert, ServiceIcon, Spinner, Stars, Empty } from '@/components/ui';
import { fieldsFor, locationLabel, type Field } from '@/lib/forms';
import { computeDeposit, ksh, quantityLabel, unitLabel } from '@/lib/utils';
import type { Provider, Service } from '@/lib/types';
import { Users } from 'lucide-react';

type Review = { id: string; rating: number; comment: string | null; created_at: string };

export default function BookService({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { profile } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('services').select('*').eq('slug', slug).eq('active', true).single();
      setService(s as Service | null);
      const { data: p } = await supabase.from('provider_directory').select('*').contains('skills', [slug]).order('rating_avg', { ascending: false });
      setProviders((p as Provider[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  const fields: Field[] = useMemo(() => (service ? fieldsFor(service.slug, service.category) : []), [service]);
  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <Spinner />;
  if (!service) return <Empty icon={Lock} title="Service not found" text="This service is not available right now." />;

  const hasQty = service.price_unit !== 'flat';
  const price = service.base_price * (hasQty ? Math.max(qty, 1) : 1);
  const deposit = computeDeposit(price);
  const provider = providers.find((p) => p.id === chosen);

  const validateStep1 = () => {
    if (!address.trim()) return `Please fill in: ${locationLabel(service.category)}`;
    if (!date) return 'Please choose a date.';
    if (date < today) return 'The date cannot be in the past.';
    if (service.category !== 'care' && !time) return 'Please choose a preferred time.';
    for (const f of fields) {
      if (f.required) {
        const v = answers[f.label];
        if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return `Please answer: ${f.label}`;
      }
    }
    if (service.slug === 'house-hunting') {
      const min = Number(answers['Minimum rent budget (KSh)']); const max = Number(answers['Maximum rent budget (KSh)']);
      if (min > max) return 'Your minimum budget cannot be higher than your maximum.';
    }
    return '';
  };

  const next = () => {
    const e = step === 1 ? validateStep1() : step === 2 && !chosen ? 'Please choose a provider to continue.' : '';
    setErr(e);
    if (!e) setStep(step + 1);
  };

  const toggleReviews = async (id: string) => {
    setOpen(open === id ? null : id);
    if (!reviews[id]) {
      const { data } = await supabase.from('reviews').select('id,rating,comment,created_at').eq('employee_id', id).order('created_at', { ascending: false }).limit(5);
      setReviews((r) => ({ ...r, [id]: (data as Review[]) || [] }));
    }
  };

  const confirm = async () => {
    setBusy(true); setErr('');
    const details: Record<string, any> = {};
    fields.forEach((f) => { const v = answers[f.label]; if (v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) details[f.label] = Array.isArray(v) ? v.join(', ') : v; });
    const { data, error } = await supabase.from('bookings').insert({
      customer_id: profile!.id, employee_id: chosen, service_id: service.id, quantity: hasQty ? Math.max(qty, 1) : 1,
      details, address: address.trim(), scheduled_date: date, scheduled_time: time || null, notes: notes.trim() || null,
    }).select('id').single();
    setBusy(false);
    if (error) return setErr(error.message);
    router.replace(`/customer/bookings/${data.id}?pay=1`);
  };

  const setA = (k: string, v: any) => setAnswers((a) => ({ ...a, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customer" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-600"><ArrowLeft className="h-4 w-4" /> All services</Link>
      <div className="mb-6 flex items-center gap-4">
        <span className="rounded-lg bg-forest p-4 text-gold"><ServiceIcon name={service.icon} className="h-8 w-8" /></span>
        <div><h1 className="text-3xl leading-tight text-forest md:text-4xl">{service.name}</h1>
          <p className="text-forest-500">{service.price_note} {ksh(service.base_price)} {unitLabel[service.price_unit]}</p></div>
      </div>
      <p className="mb-6 text-forest-600">{service.description}</p>

      {/* progress */}
      <ol className="mb-6 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        {['Details', 'Choose provider', 'Review'].map((t, i) => (
          <li key={t} className={`rounded-full py-2 ${step === i + 1 ? 'bg-forest text-white' : step > i + 1 ? 'bg-gold text-forest-900' : 'bg-forest-50 text-forest-400'}`}>
            {step > i + 1 ? <Check className="mx-auto h-4 w-4" /> : `${i + 1}. ${t}`}
          </li>
        ))}
      </ol>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="card space-y-5 p-5 md:p-7">
          {hasQty && (
            <div><label className="label">{quantityLabel[service.price_unit]}</label>
              <input className="input" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
              <p className="mt-1 text-sm text-forest-500">Estimated price: <b>{ksh(price)}</b></p></div>
          )}
          <div><label className="label">{locationLabel(service.category)} *</label>
            <div className="relative"><MapPin className="absolute left-3 top-3 h-5 w-5 text-forest-300" />
              <input className="input pl-10" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Estate, street, building, house no." /></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">{service.category === 'house_hunting' ? 'Start searching from *' : 'Preferred date *'}</label><input className="input" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} /></div>
            {service.category !== 'care' && <div><label className="label">Preferred time *</label><input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>}
          </div>
          {fields.map((f) => (
            <div key={f.label}>
              <label className="label">{f.label}{f.required && ' *'}</label>
              {f.type === 'select' && (
                <select className="input" value={answers[f.label] ?? ''} onChange={(e) => setA(f.label, e.target.value)}>
                  <option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              )}
              {f.type === 'chips' && (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((o) => {
                    const on = (answers[f.label] || []).includes(o);
                    return <button type="button" key={o} onClick={() => setA(f.label, on ? answers[f.label].filter((x: string) => x !== o) : [...(answers[f.label] || []), o])}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-forest bg-forest text-white' : 'border-forest/25 hover:bg-forest-50'}`}>{o}</button>;
                  })}
                </div>
              )}
              {f.type === 'textarea' && <textarea className="input min-h-24" value={answers[f.label] ?? ''} placeholder={f.placeholder} onChange={(e) => setA(f.label, e.target.value)} />}
              {['text', 'number', 'date', 'time'].includes(f.type) && <input className="input" type={f.type} min={f.type === 'number' ? 0 : undefined} value={answers[f.label] ?? ''} placeholder={(f as any).placeholder} onChange={(e) => setA(f.label, e.target.value)} />}
            </div>
          ))}
          <div><label className="label">Anything else we should know?</label><textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate codes, landmarks, special requests…" /></div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-3">
          <Alert kind="info"><Lock className="mr-1 inline h-4 w-4" />You can chat with your chosen provider after paying the booking deposit.</Alert>
          {providers.length === 0 ? <Empty icon={Users} title="No providers available yet" text="No approved employee offers this service right now. Please check again soon or call 0707 089 523." /> :
            providers.map((p) => (
              <div key={p.id} className={`card overflow-hidden transition ${chosen === p.id ? 'ring-2 ring-forest' : ''}`}>
                <div className="flex items-center gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.avatar_url ? <img src={p.avatar_url} alt={p.full_name} className="h-16 w-16 rounded-full object-cover ring-2 ring-gold" /> :
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-2xl font-bold text-gold">{p.full_name[0]}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl leading-tight">{p.full_name}</p>
                    <Stars value={p.rating_avg} count={p.rating_count} />
                    {p.location && <p className="flex items-center gap-1 text-xs text-forest-500"><MapPin className="h-3 w-3" />{p.location}</p>}
                  </div>
                  <button onClick={() => setChosen(p.id)} className={chosen === p.id ? 'btn-primary !px-4 !py-2' : 'btn-ghost !px-4 !py-2'}>{chosen === p.id ? <><Check className="h-4 w-4" />Chosen</> : 'Choose'}</button>
                </div>
                {p.bio && <p className="px-4 pb-3 text-sm text-forest-600">{p.bio}</p>}
                <button onClick={() => toggleReviews(p.id)} className="flex w-full items-center justify-between border-t border-gold/20 bg-forest-50 px-4 py-2 text-sm font-semibold text-forest-600">
                  Customer reviews <ChevronDown className={`h-4 w-4 transition ${open === p.id ? 'rotate-180' : ''}`} />
                </button>
                {open === p.id && (
                  <div className="space-y-2 bg-forest-50 px-4 pb-4">
                    {(reviews[p.id] || []).length === 0 && <p className="text-sm text-forest-400">No reviews yet.</p>}
                    {(reviews[p.id] || []).map((r) => <div key={r.id} className="rounded-xl bg-white p-3 text-sm"><Stars value={r.rating} />{r.comment && <p className="mt-1">{r.comment}</p>}</div>)}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="card space-y-4 p-5 md:p-7">
          <h2 className="text-2xl">Review your booking</h2>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-forest-400">Service</dt><dd className="font-semibold">{service.name}{hasQty && ` × ${qty}`}</dd></div>
            <div><dt className="text-forest-400">Provider</dt><dd className="font-semibold">{provider?.full_name}</dd></div>
            <div><dt className="text-forest-400">Where</dt><dd className="font-semibold">{address}</dd></div>
            <div><dt className="text-forest-400">When</dt><dd className="font-semibold">{date} {time}</dd></div>
            {Object.entries(answers).filter(([, v]) => v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
              <div key={k}><dt className="text-forest-400">{k}</dt><dd className="font-semibold">{Array.isArray(v) ? v.join(', ') : String(v)}</dd></div>
            ))}
          </dl>
          <div className="rounded-lg bg-forest p-5 text-white">
            <div className="flex justify-between"><span>{service.price_note} price</span><b>{ksh(price)}</b></div>
            <div className="mt-1 flex justify-between text-gold"><span>Deposit to pay now {price >= 1000 ? '(10%)' : '(flat)'}</span><b className="text-xl">{ksh(deposit)}</b></div>
            <div className="mt-1 flex justify-between text-sm text-white/70"><span>Balance (paid after the service)</span><span>{ksh(Math.max(price - deposit, 0))}</span></div>
          </div>
          <Alert kind="info"><MessageCircle className="mr-1 inline h-4 w-4" />After you confirm, you will be asked to pay the deposit. Chat with your provider unlocks as soon as it is paid.</Alert>
        </div>
      )}

      {err && <div className="mt-4"><Alert>{err}</Alert></div>}
      <div className="mt-6 flex justify-between gap-3">
        {step > 1 ? <button className="btn-ghost" onClick={() => { setErr(''); setStep(step - 1); }}><ArrowLeft className="h-4 w-4" />Back</button> : <span />}
        {step < 3 ? <button className="btn-primary" onClick={next}>Continue <ArrowRight className="h-4 w-4" /></button>
          : <button className="btn-gold" onClick={confirm} disabled={busy}>{busy ? 'Booking…' : 'Confirm & pay deposit'}</button>}
      </div>
    </div>
  );
}
