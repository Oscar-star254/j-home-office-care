'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, PageTitle, RoleBadge, Spinner, Stars } from '@/components/ui';
import type { Profile } from '@/lib/types';

export default function Users() {
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [err, setErr] = useState('');
  const load = () => supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows((data as Profile[]) || []));
  useEffect(() => { load(); }, []);

  const setStatus = async (p: Profile, status: string) => {
    if (!confirm(`${status === 'suspended' ? 'Suspend' : 'Reinstate'} ${p.full_name}?`)) return;
    const { error } = await supabase.from('profiles').update({ status }).eq('id', p.id);
    if (error) setErr(error.message); else load();
  };

  if (!rows) return <Spinner />;
  const list = rows.filter((r) => (role === 'all' || r.role === role) && `${r.full_name} ${r.email} ${r.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageTitle title="Users" sub="Admins, customers and employees." />
      {err && <Alert>{err}</Alert>}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-3 h-5 w-5 text-forest-300" /><input className="input pl-10" placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input !w-auto" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option><option value="customer">Customers</option><option value="employee">Employees</option><option value="admin">Admins</option></select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-forest text-white"><tr><th className="p-3">Name</th><th>Role</th><th>Contact</th><th>Status</th><th>Rating</th><th></th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p.id} className="border-t border-gold/15">
              <td className="p-3 font-semibold">{p.full_name}</td>
              <td><RoleBadge role={p.role} /></td>
              <td className="text-forest-600">{p.email}<br />+{p.phone}</td>
              <td><span className={`badge ${p.status === 'approved' ? 'bg-green-100 text-green-700' : p.status === 'pending' ? 'bg-gold-100 text-gold-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span></td>
              <td>{p.role === 'employee' ? <Stars value={p.rating_avg} count={p.rating_count} /> : '—'}</td>
              <td className="pr-3 text-right">{p.role !== 'admin' && (p.status === 'suspended' ? <button className="font-semibold text-forest" onClick={() => setStatus(p, 'approved')}>Reinstate</button> : p.status === 'approved' && <button className="font-semibold text-red-600" onClick={() => setStatus(p, 'suspended')}>Suspend</button>)}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
