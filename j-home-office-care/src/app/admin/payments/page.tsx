'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageTitle, Spinner } from '@/components/ui';
import { ksh } from '@/lib/utils';

export default function Payments() {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { supabase.from('payments').select('*, bookings(reference)').order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows(data || [])); }, []);
  if (!rows) return <Spinner />;
  const total = rows.filter((r) => r.status === 'paid').reduce((a, r) => a + r.amount, 0);
  return (
    <>
      <PageTitle title="Deposit payments" sub={`Total collected: ${ksh(total)}`} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-forest text-white"><tr><th className="p-3">Date</th><th>Booking</th><th>Phone</th><th>Amount</th><th>Receipt</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-gold/15">
              <td className="p-3">{new Date(r.created_at).toLocaleString('en-KE')}</td><td>{r.bookings?.reference}</td><td>+{r.phone}</td><td>{ksh(r.amount)}</td><td>{r.mpesa_receipt || '—'}</td>
              <td><span className={`badge ${r.status === 'paid' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-gold-700'}`}>{r.status}</span></td>
            </tr>))}</tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-forest-400">No payments yet.</p>}
      </div>
    </>
  );
}
