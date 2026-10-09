'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, XCircle, ShieldAlert } from 'lucide-react';
import { useAuth, homeFor } from '@/lib/auth';
import { Guard } from '@/components/Shell';
import { AuthFrame } from '@/components/AuthFrame';

function Pending() {
  const { profile, refresh, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => { if (profile && homeFor(profile) === '/employee') router.replace('/employee'); }, [profile, router]);
  useEffect(() => { const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);
  const s = profile?.status;
  const view = s === 'rejected' ? { I: XCircle, c: 'text-red-600', t: 'Application not approved', p: profile?.rejection_reason || 'Please contact us on 0707 089 523 for help.' }
    : s === 'suspended' ? { I: ShieldAlert, c: 'text-orange-600', t: 'Account suspended', p: 'Please contact us on 0707 089 523.' }
    : { I: Clock, c: 'text-gold', t: 'Waiting for approval', p: 'We received your details. Our admin is reviewing your ID. This page updates automatically once you are approved.' };
  return (
    <AuthFrame title={view.t}>
      <div className="card p-6 text-center">
        <view.I className={`mx-auto h-14 w-14 ${view.c}`} />
        <p className="mt-3 text-forest-600">{view.p}</p>
        <button onClick={async () => { await signOut(); router.replace('/'); }} className="btn-ghost mt-5">Sign out</button>
      </div>
    </AuthFrame>
  );
}
export default function Page() { return <Guard role="employee" allowUnverified><Pending /></Guard>; }
