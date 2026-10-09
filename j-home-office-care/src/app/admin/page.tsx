'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Users, UserCheck, ClipboardList, Wallet, Images, BriefcaseBusiness } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageTitle, Spinner } from '@/components/ui';
import { ksh, statusMeta } from '@/lib/utils';

export default function AdminHome() {
  const [s, setS] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const count = async (q: any) => (await q).count || 0;
      const head = { count: 'exact' as const, head: true };
      const [pending, customers, employees, bookings, active, work, pays] = await Promise.all([
        count(supabase.from('profiles').select('id', head).eq('role', 'employee').eq('status', 'pending').eq('id_submitted', true)),
        count(supabase.from('profiles').select('id', head).eq('role', 'customer')),
        count(supabase.from('profiles').select('id', head).eq('role', 'employee').eq('status', 'approved')),
        count(supabase.from('bookings').select('id', head)),
        count(supabase.from('bookings').select('id', head).in('status', ['requested', 'accepted', 'in_progress'])),
        count(supabase.from('portfolio').select('id', head)),
        supabase.from('payments').select('amount').eq('status', 'paid'),
      ]);
      setS({ pending, customers, employees, bookings, active, work, revenue: ((pays as any).data || []).reduce((a: number, p: any) => a + p.amount, 0) });
      const { data } = await supabase.from('bookings').select('*, services(name)').order('created_at', { ascending: false }).limit(6);
      setRecent(data || []);
    })();
  }, []);
  if (!s) return <Spinner />;
  const cards = [
    { i: UserCheck, l: 'Awaiting approval', v: s.pending, href: '/admin/approvals', hot: s.pending > 0 },
    { i: Users, l: 'Customers', v: s.customers, href: '/admin/users' },
    { i: BriefcaseBusiness, l: 'Approved employees', v: s.employees, href: '/admin/users' },
    { i: ClipboardList, l: 'Active bookings', v: s.active, href: '/admin/bookings' },
    { i: Wallet, l: 'Deposits collected', v: ksh(s.revenue), href: '/admin/payments' },
    { i: Images, l: 'Photos in Our Work', v: s.work, href: '/admin/portfolio' },
  ];
  return (
    <div className="space-y-8">
      <PageTitle title="Admin dashboard" sub="You control everything from here." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.l} href={c.href} className={`card p-5 transition hover:-translate-y-0.5 ${c.hot ? 'border-2 border-gold' : ''}`}>
            <span className={`inline-flex rounded-xl p-2.5 ${c.hot ? 'bg-gold text-forest-900' : 'bg-forest text-gold'}`}><c.i className="h-5 w-5" /></span>
            <p className="mt-3 font-display text-3xl">{c.v}</p><p className="text-sm text-forest-500">{c.l}</p>
          </Link>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-2xl uppercase">Latest bookings</h2>
        <div className="grid gap-2">{recent.map((b) => (
          <Link key={b.id} href={`/admin/bookings/${b.id}`} className="card flex items-center justify-between p-3 px-4">
            <span><b>{b.services?.name}</b> <span className="text-sm text-forest-500">· {b.reference}</span></span>
            <span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span>
          </Link>))}
          {recent.length === 0 && <p className="card p-6 text-center text-forest-400">No bookings yet.</p>}
        </div>
      </section>
    </div>
  );
}
