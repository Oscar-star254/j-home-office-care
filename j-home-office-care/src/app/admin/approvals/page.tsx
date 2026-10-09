'use client';
import { useEffect, useState } from 'react';
import { Check, X, Phone, Mail, IdCard, MapPin, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Empty, Modal, PageTitle, Spinner, useSignedUrl } from '@/components/ui';
import type { Profile } from '@/lib/types';

function IdPhotos({ p }: { p: Profile }) {
  const front = useSignedUrl('ids', p.id_photo_path);
  const back = useSignedUrl('ids', p.id_photo_path ? p.id_photo_path.replace('front', 'back') : null);
  return (
    <div className="grid grid-cols-2 gap-3">
      {[['ID front', front], ['ID back', back]].map(([l, u]) => (
        <a key={l as string} href={(u as string) || '#'} target="_blank" rel="noreferrer" className="block">
          <p className="mb-1 text-xs font-bold uppercase text-forest-400">{l}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {u ? <img src={u as string} alt={l as string} className="h-40 w-full rounded-xl border border-gold/30 object-cover" /> : <div className="h-40 animate-pulse rounded-xl bg-forest-50" />}
        </a>
      ))}
    </div>
  );
}

export default function Approvals() {
  const [rows, setRows] = useState<Profile[] | null>(null);
  const [reject, setReject] = useState<Profile | null>(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  const load = () => supabase.from('profiles').select('*').eq('role', 'employee').eq('status', 'pending').order('created_at').then(({ data }) => setRows((data as Profile[]) || []));
  useEffect(() => { load(); }, []);

  const decide = async (p: Profile, status: 'approved' | 'rejected', why?: string) => {
    setErr('');
    const { error } = await supabase.from('profiles').update({ status, rejection_reason: why || null }).eq('id', p.id);
    if (error) return setErr(error.message);
    await supabase.from('notifications').insert({ user_id: p.id, title: status === 'approved' ? 'You are approved 🎉' : 'Application update', body: status === 'approved' ? 'You can now receive jobs.' : why || 'Your application was not approved.', link: '/employee' });
    setReject(null); setReason(''); load();
  };

  if (!rows) return <Spinner />;
  return (
    <>
      <PageTitle title="Employee approvals" sub="Check the ID photos match the details, then approve or reject." />
      {err && <Alert>{err}</Alert>}
      {rows.length === 0 ? <Empty icon={UserCheck} title="All caught up" text="No employees are waiting for approval." /> : (
        <div className="grid gap-5">{rows.map((p) => (
          <div key={p.id} className="card space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-gold" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest font-bold text-gold">{p.full_name[0]}</span>}
                <div><p className="font-display text-2xl uppercase">{p.full_name}</p>
                  <p className="text-sm text-forest-500">Applied {new Date(p.created_at).toLocaleDateString('en-KE')}</p></div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" disabled={!p.id_submitted} onClick={() => decide(p, 'approved')}><Check className="h-4 w-4" />Approve</button>
                <button className="btn-danger" onClick={() => setReject(p)}><X className="h-4 w-4" />Reject</button>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2"><IdCard className="h-4 w-4 text-gold-600" />ID no: <b>{p.national_id_number}</b></p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold-600" />+{p.phone}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold-600" />{p.email} <span className="badge bg-green-100 text-green-700">confirmed</span></p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold-600" />{p.location || '—'}</p>
              <p className="sm:col-span-2">Offers: {p.skills.join(', ') || '—'}</p>
            </div>
            {p.id_submitted ? <IdPhotos p={p} /> : <Alert kind="info">This applicant has not uploaded their ID photos yet. You can approve once they do.</Alert>}
          </div>))}
        </div>
      )}
      <Modal open={!!reject} onClose={() => setReject(null)} title="Reject application">
        <p className="mb-2 text-sm text-forest-500">The applicant will see this reason.</p>
        <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. ID photo is blurry. Please apply again with a clear photo." />
        <button className="btn-danger mt-4 w-full" onClick={() => reject && decide(reject, 'rejected', reason)}>Reject applicant</button>
      </Modal>
    </>
  );
}
