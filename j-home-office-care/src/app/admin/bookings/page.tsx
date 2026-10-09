'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageTitle, Spinner } from '@/components/ui';
import { ksh, statusMeta } from '@/lib/utils';

export default function AdminBookings() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [f, setF] = useState('all');
  useEffect(() => { supabase.from('bookings').select('*, services(name)').order('created_at', { ascending: false }).then(({ data }) => setRows(data || [])); }, []);
  if (!rows) return <Spinner />;
  const list = rows.filter((r) => f === 'all' || r.status === f);
  return (
    <>
      <PageTitle title="All bookings" action={<select className="input !w-auto" value={f} onChange={(e) => setF(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-forest text-white"><tr><th className="p-3">Ref</th><th>Service</th><th>Date</th><th>Price</th><th>Deposit</th><th>Status</th></tr></thead>
          <tbody>{list.map((b) => (
            <tr key={b.id} className="border-t border-gold/15 hover:bg-forest-50">
              <td className="p-3"><Link className="font-bold text-gold-700" href={`/admin/bookings/${b.id}`}>{b.reference}</Link></td>
              <td>{b.services?.name}</td><td>{b.scheduled_date}</td><td>{ksh(b.estimated_price)}</td>
              <td>{ksh(b.deposit_amount)} {b.deposit_paid ? '✓' : ''}</td>
              <td><span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span></td>
            </tr>))}</tbody>
        </table>
        {list.length === 0 && <p className="p-8 text-center text-forest-400">No bookings.</p>}
      </div>
    </>
  );
}
