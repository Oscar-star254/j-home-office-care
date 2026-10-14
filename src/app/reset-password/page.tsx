'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthFrame } from '@/components/AuthFrame';
import { Alert } from '@/components/ui';

export default function ResetPassword() {
  const router = useRouter();
  const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setErr(error.message);
    setDone(true); setTimeout(() => router.replace('/login'), 1500);
  };
  return (
    <AuthFrame title="New password" sub="Choose a new password for your account.">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="label">New password</label><input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} /></div>
        {err && <Alert>{err}</Alert>}{done && <Alert kind="success">Password updated. Taking you to sign in…</Alert>}
        <button className="btn-primary w-full">Save password</button>
      </form>
    </AuthFrame>
  );
}
