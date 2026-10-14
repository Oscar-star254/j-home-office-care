'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Lock, IdCard, MapPin, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthFrame } from '@/components/AuthFrame';
import { Alert } from '@/components/ui';
import { normalizeKePhone } from '@/lib/utils';
import type { Service } from '@/lib/types';

export default function EmployeeSignup() {
  const [services, setServices] = useState<Service[]>([]);
  const [f, setF] = useState({ name: '', email: '', phone: '', idno: '', location: '', password: '' });
  const [skills, setSkills] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { supabase.from('services').select('*').eq('active', true).order('sort_order').then(({ data }) => setServices((data as Service[]) || [])); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const phone = normalizeKePhone(f.phone);
    if (!phone) return setErr('Enter a valid Kenyan phone number, e.g. 0712 345 678.');
    if (!/^\d{7,9}$/.test(f.idno.trim())) return setErr('Enter your National ID number (7–9 digits).');
    if (skills.length === 0) return setErr('Pick at least one service you can offer.');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { role: 'employee', full_name: f.name.trim(), phone, national_id_number: f.idno.trim(), location: f.location.trim(), skills },
      },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.user && data.user.identities?.length === 0) return setErr('An account with this email already exists. Try signing in.');
    setSent(true);
  };

  if (sent) return (
    <AuthFrame title="Almost there">
      <div className="card p-6">
        <MailCheck className="mx-auto h-12 w-12 text-gold" />
        <p className="mt-3 text-center font-semibold">Confirm your email: {f.email}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-forest-600">
          <li>Open the link we just emailed you.</li>
          <li>Sign in and upload clear photos of your ID card (front and back) and a profile photo.</li>
          <li>Our admin reviews your details and approves your account.</li>
        </ol>
        <Link href="/login" className="btn-primary mt-5 w-full">Go to sign in</Link>
      </div>
    </AuthFrame>
  );

  const toggle = (slug: string) => setSkills((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  return (
    <AuthFrame wide title="Join our team" sub="Apply to become a J Home & Office Care provider. Every employee is verified before they can take jobs.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name (as on ID)</label><div className="relative"><User className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required value={f.name} onChange={set('name')} /></div></div>
          <div><label className="label">National ID number</label><div className="relative"><IdCard className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required inputMode="numeric" value={f.idno} onChange={set('idno')} /></div></div>
          <div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" type="email" required value={f.email} onChange={set('email')} /></div></div>
          <div><label className="label">Phone number</label><div className="relative"><Phone className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required value={f.phone} onChange={set('phone')} placeholder="0712 345 678" /></div></div>
          <div><label className="label">Area you work in</label><div className="relative"><MapPin className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required value={f.location} onChange={set('location')} placeholder="e.g. Ruiru, Juja, Thika" /></div></div>
          <div><label className="label">Password</label><div className="relative"><Lock className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" type="password" required minLength={8} value={f.password} onChange={set('password')} /></div></div>
        </div>
        <div>
          <label className="label">Services you can offer</label>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <button type="button" key={s.slug} onClick={() => toggle(s.slug)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${skills.includes(s.slug) ? 'border-forest bg-forest text-white' : 'border-forest/25 hover:bg-forest-50'}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <Alert kind="info">After confirming your email you will be asked to upload clear photos of your ID card (front and back) and a profile photo.</Alert>
        {err && <Alert>{err}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : 'Apply as employee'}</button>
      </form>
      <p className="mt-6 text-center text-sm">Already applied? <Link className="font-semibold text-gold-600" href="/login">Sign in</Link></p>
    </AuthFrame>
  );
}
