'use client';
import { useState } from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Lock, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthFrame } from '@/components/AuthFrame';
import { Alert } from '@/components/ui';
import { normalizeKePhone } from '@/lib/utils';

export default function CustomerSignup() {
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [sent, setSent] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    const phone = normalizeKePhone(f.phone);
    if (!phone) return setErr('Enter a valid Kenyan phone number, e.g. 0712 345 678.');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { emailRedirectTo: `${window.location.origin}/login`, data: { role: 'customer', full_name: f.name.trim(), phone } },
    });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.user && data.user.identities?.length === 0) return setErr('An account with this email already exists. Try signing in.');
    setSent(true);
  };

  if (sent) return (
    <AuthFrame title="Check your email">
      <div className="card p-6 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-gold" />
        <p className="mt-3 font-semibold">We sent a confirmation link to {f.email}.</p>
        <p className="mt-1 text-sm text-forest-500">Open it to confirm your email, then sign in to see our services.</p>
        <Link href="/login" className="btn-primary mt-5">Go to sign in</Link>
      </div>
    </AuthFrame>
  );

  return (
    <AuthFrame title="Create account" sub="Book cleaning, house hunting, laundry and more in minutes.">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Full name</label><div className="relative"><User className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required value={f.name} onChange={set('name')} autoComplete="name" /></div></div>
        <div><label className="label">Email</label><div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></div></div>
        <div><label className="label">Phone number</label><div className="relative"><Phone className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" required value={f.phone} onChange={set('phone')} placeholder="0712 345 678" autoComplete="tel" /></div></div>
        <div><label className="label">Password</label><div className="relative"><Lock className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" type="password" required minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" /></div></div>
        {err && <Alert>{err}</Alert>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create customer account'}</button>
      </form>
      <p className="mt-6 text-center text-sm">Already have an account? <Link className="font-semibold text-gold-600" href="/login">Sign in</Link></p>
      <p className="mt-2 text-center text-sm">Want to work with us? <Link className="font-semibold text-gold-600" href="/signup/employee">Apply as an employee</Link></p>
    </AuthFrame>
  );
}
