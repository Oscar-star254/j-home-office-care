'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, Hourglass, Star, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageTitle, Spinner, Stars } from '@/components/ui';
import { ksh, statusMeta } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export default function EmployeeHome() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Booking[] | null>(null);
  useEffect(() => { supabase.from('bookings').select('*, services(name)').order('created_at', { ascending: false }).then(({ data }) => setRows((data as any) || [])); }, []);
  if (!rows) return <Spinner />;

  const newReq = rows.filter((r) => r.status === 'requested');
  const active = rows.filter((r) => ['accepted', 'in_progress'].includes(r.status));
  const done = rows.filter((r) => r.status === 'completed');
  const stats = [
    { i: Hourglass, l: 'New requests', v: newReq.length },
    { i: Briefcase, l: 'Active jobs', v: active.length },
    { i: CheckCircle2, l: 'Completed', v: done.length },
    { i: Wallet, l: 'Value completed', v: ksh(done.reduce((a, b) => a + b.estimated_price, 0)) },
  ];
  return (
    <div className="space-y-8">
      <PageTitle title={`Hi ${profile?.full_name.split(' ')[0]}`} sub="Here is what is happening with your jobs." action={<div className="card flex items-center gap-2 px-4 py-2"><Star className="h-5 w-5 fill-gold text-gold" /><Stars value={profile?.rating_avg || 0} count={profile?.rating_count || 0} /></div>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => <div key={s.l} className="card p-5"><span className="inline-flex rounded-xl bg-forest p-2.5 text-gold"><s.i className="h-5 w-5" /></span><p className="mt-3 font-display text-3xl">{s.v}</p><p className="text-sm text-forest-500">{s.l}</p></div>)}
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl uppercase">New requests</h2><Link href="/employee/jobs" className="text-sm font-semibold text-gold-600">All jobs</Link></div>
        {newReq.length === 0 ? <p className="card p-6 text-center text-forest-400">No new requests right now.</p> : (
          <div className="grid gap-3">{newReq.map((b) => (
            <Link key={b.id} href={`/employee/jobs/${b.id}`} className="card flex items-center justify-between p-4 hover:-translate-y-0.5 transition">
              <div><b className="font-display text-xl uppercase">{(b as any).services?.name}</b><p className="text-sm text-forest-500">{b.scheduled_date} · {b.address}</p></div>
              <span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span>
            </Link>))}</div>
        )}
      </section>
    </div>
  );
}
