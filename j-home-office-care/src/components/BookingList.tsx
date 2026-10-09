'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, ChevronRight, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Empty, Spinner } from './ui';
import { ksh, statusMeta } from '@/lib/utils';
import type { Booking } from '@/lib/types';

export function BookingList({ role, base }: { role: 'customer' | 'employee'; base: string }) {
  const [rows, setRows] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    const load = () => supabase.from('bookings').select('*, services(name)').order('created_at', { ascending: false }).then(({ data }) => setRows((data as any) || []));
    load();
    const ch = supabase.channel('list-' + role).on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role]);

  if (!rows) return <Spinner />;
  const past = ['completed', 'cancelled', 'declined', 'refund_due'];
  const list = rows.filter((r) => (tab === 'past' ? past.includes(r.status) : !past.includes(r.status)));

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-forest-50 p-1">
        {(['active', 'past'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-1.5 text-sm font-bold uppercase ${tab === t ? 'bg-forest text-white' : 'text-forest-500'}`}>{t}</button>
        ))}
      </div>
      {list.length === 0 ? <Empty icon={ClipboardList} title={tab === 'active' ? 'Nothing active' : 'No past jobs yet'} text={role === 'customer' && tab === 'active' ? 'Pick a service on the Home page to make your first booking.' : undefined} /> : (
        <div className="grid gap-3">
          {list.map((b) => (
            <Link key={b.id} href={`${base}/${b.id}`} className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><b className="font-display text-xl uppercase">{(b as any).services?.name}</b><span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span></div>
                <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-forest-500">
                  <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{b.scheduled_date}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{b.address}</span>
                </p>
              </div>
              <div className="text-right"><p className="font-display text-lg">{ksh(b.estimated_price)}</p><p className="text-xs text-forest-400">Ref {b.reference}</p></div>
              <ChevronRight className="h-5 w-5 text-forest-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
