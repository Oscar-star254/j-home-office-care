'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth, homeFor } from '@/lib/auth';
import { AuthFrame } from '@/components/AuthFrame';
import { Alert } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { profile, session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (!loading && session && profile) {
      const home = homeFor(profile);
      router.replace(next && next.startsWith(`/${profile.role}`) ? next : home);
    }
  }, [loading, session, profile, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message.includes('Email not confirmed') ? 'Please confirm your email first — check your inbox for our message.' : 'Wrong email or password.');
  };

  const forgot = async () => {
    setErr(''); setInfo('');
    if (!email) { setErr('Type your email above first, then tap “Forgot password”.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setErr(error.message); else setInfo('Password reset link sent. Check your email.');
  };

  return (
    <AuthFrame title="Welcome back" sub="Sign in as a customer, employee or admin — we will take you to the right place.">
      {!isSupabaseConfigured && <div className="mb-4"><Alert kind="info">Backend not connected yet. Add your Supabase keys in <code>.env.local</code> (see README).</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">Email</label>
          <div className="relative"><Mail className="absolute left-3 top-3 h-5 w-5 text-forest-300" />
            <input className="input pl-10" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div></div>
        <div><label className="label">Password</label>
          <div className="relative"><Lock className="absolute left-3 top-3 h-5 w-5 text-forest-300" />
            <input className="input pl-10" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></div></div>
        {err && <Alert>{err}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <button className="btn-primary w-full" disabled={busy}><LogIn className="h-5 w-5" />{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" onClick={forgot} className="block w-full text-center text-sm font-semibold text-gold-600">Forgot password?</button>
      </form>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/signup" className="btn-ghost text-sm">New customer? Sign up</Link>
        <Link href="/signup/employee" className="btn-ghost text-sm">Join our team</Link>
      </div>
    </AuthFrame>
  );
}
export default function Page() { return <Suspense><LoginForm /></Suspense>; }
