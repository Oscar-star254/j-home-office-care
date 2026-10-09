'use client';
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, PageTitle, Spinner } from '@/components/ui';
import { computeDeposit, ksh } from '@/lib/utils';

const FIELDS = [
  { k: 'deposit_threshold', l: 'Deposit threshold (KSh)', h: 'Services priced at or above this pay a percentage deposit.' },
  { k: 'deposit_percent', l: 'Deposit percent (%)', h: 'Percentage charged for services at or above the threshold.' },
  { k: 'deposit_flat', l: 'Flat deposit (KSh)', h: 'Deposit for services below the threshold.' },
  { k: 'contact_phone', l: 'Contact phone', h: '' },
  { k: 'contact_email', l: 'Contact email', h: '' },
];

export default function SettingsPage() {
  const [v, setV] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  useEffect(() => { supabase.from('settings').select('*').then(({ data }) => setV(Object.fromEntries((data || []).map((r: any) => [r.key, r.value])))); }, []);
  if (!v) return <Spinner />;
  const save = async () => {
    const { error } = await supabase.from('settings').upsert(Object.entries(v).map(([key, value]) => ({ key, value })));
    setMsg(error ? { k: 'error', t: error.message } : { k: 'success', t: 'Settings saved.' });
  };
  return (
    <>
      <PageTitle title="Settings" />
      <div className="card max-w-xl space-y-4 p-6">
        {FIELDS.map((f) => (
          <div key={f.k}><label className="label">{f.l}</label><input className="input" value={v[f.k] || ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />{f.h && <p className="mt-1 text-xs text-forest-400">{f.h}</p>}</div>
        ))}
        <p className="rounded-xl bg-forest-50 p-3 text-sm">Example now: a KSh 2,000 service needs a <b>{ksh(computeDeposit(2000))}</b> deposit; a KSh 500 service needs <b>{ksh(computeDeposit(500))}</b>. (Preview uses the default rule 10% / KSh 100.)</p>
        {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
        <button className="btn-primary" onClick={save}><Save className="h-4 w-4" />Save settings</button>
      </div>
    </>
  );
}
