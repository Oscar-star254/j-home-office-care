'use client';
import { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Modal, PageTitle, Spinner } from '@/components/ui';
import { categoryMeta, unitLabel } from '@/lib/utils';
import type { Service } from '@/lib/types';

export default function ServicesAdmin() {
  const [rows, setRows] = useState<Service[] | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [add, setAdd] = useState(false);
  const [n, setN] = useState({ name: '', category: 'cleaning', description: '', base_price: 500, price_unit: 'flat' });
  const load = () => supabase.from('services').select('*').order('sort_order').then(({ data }) => setRows((data as Service[]) || []));
  useEffect(() => { load(); }, []);

  const save = async (s: Service) => {
    setErr(''); setOk('');
    const { error } = await supabase.from('services').update({ name: s.name, description: s.description, base_price: s.base_price, active: s.active, featured: s.featured }).eq('id', s.id);
    if (error) setErr(error.message); else setOk(`${s.name} saved.`);
  };
  const create = async () => {
    const slug = n.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { error } = await supabase.from('services').insert({ ...n, slug, icon: 'sparkles', sort_order: 200 });
    if (error) return setErr(error.message);
    setAdd(false); load();
  };
  const edit = (id: string, patch: Partial<Service>) => setRows((r) => r!.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  if (!rows) return <Spinner />;
  return (
    <>
      <PageTitle title="Services & prices" sub="Change prices, hide a service or add a new one. Deposits are calculated automatically." action={<button className="btn-primary" onClick={() => setAdd(true)}><Plus className="h-4 w-4" />Add service</button>} />
      {err && <Alert>{err}</Alert>}{ok && <Alert kind="success">{ok}</Alert>}
      <div className="mt-4 grid gap-3">
        {rows.map((s) => (
          <div key={s.id} className={`card grid items-center gap-3 p-4 md:grid-cols-[1.4fr_1fr_auto_auto_auto] ${s.active ? '' : 'opacity-60'}`}>
            <div><input className="input font-semibold" value={s.name} onChange={(e) => edit(s.id, { name: e.target.value })} /><p className="mt-1 text-xs text-forest-400">{categoryMeta[s.category]?.label || s.category} {unitLabel[s.price_unit] && `· ${unitLabel[s.price_unit]}`}</p></div>
            <div className="flex items-center gap-2"><span className="text-sm">KSh</span><input className="input" type="number" min={0} value={s.base_price} onChange={(e) => edit(s.id, { base_price: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={s.active} onChange={(e) => edit(s.id, { active: e.target.checked })} />Visible</label>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={s.featured} onChange={(e) => edit(s.id, { featured: e.target.checked })} />Featured</label>
            <button className="btn-ghost !py-2" onClick={() => save(s)}><Save className="h-4 w-4" />Save</button>
          </div>
        ))}
      </div>
      <Modal open={add} onClose={() => setAdd(false)} title="Add service">
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></div>
          <div><label className="label">Category</label><select className="input" value={n.category} onChange={(e) => setN({ ...n, category: e.target.value })}>{Object.entries(categoryMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="label">Price (KSh)</label><input className="input" type="number" value={n.base_price} onChange={(e) => setN({ ...n, base_price: Number(e.target.value) })} /></div>
          <div><label className="label">Priced</label><select className="input" value={n.price_unit} onChange={(e) => setN({ ...n, price_unit: e.target.value })}>{Object.keys(unitLabel).map((k) => <option key={k} value={k}>{unitLabel[k] || 'flat (one price)'}</option>)}</select></div>
          <div><label className="label">Description</label><textarea className="input" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} /></div>
          <button className="btn-primary w-full" onClick={create} disabled={!n.name.trim()}>Create service</button>
        </div>
      </Modal>
    </>
  );
}
