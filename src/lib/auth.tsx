'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface Ctx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refresh: async () => {}, signOut: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function homeFor(p: Profile | null): string {
  if (!p) return '/login';
  if (p.role === 'admin') return '/admin';
  if (p.role === 'customer') return '/customer';
  if (!p.id_submitted) return '/employee/onboarding';
  if (p.status !== 'approved') return '/employee/pending';
  return '/employee';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // defer to avoid deadlocks inside the auth callback
      setTimeout(() => loadProfile(s), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const refresh = useCallback(async () => { await loadProfile(session); }, [loadProfile, session]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); setProfile(null); }, []);

  return <AuthCtx.Provider value={{ session, profile, loading, refresh, signOut }}>{children}</AuthCtx.Provider>;
}
