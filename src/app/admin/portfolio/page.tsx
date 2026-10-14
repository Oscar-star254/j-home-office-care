'use client';
import { useEffect, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Alert, Empty, PageTitle, Spinner, compressImage, publicUrl } from '@/components/ui';
import { categoryMeta } from '@/lib/utils';
import type { PortfolioItem } from '@/lib/types';

export default function PortfolioAdmin() {
  const [rows, setRows] = useState<PortfolioItem[] | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('cleaning');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const load = () => supabase.from('portfolio').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows((data as PortfolioItem[]) || []));
  useEffect(() => { load(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!files.length) return setErr('Choose at least one picture.');
    setBusy(true);
    try {
      for (const [i, f] of files.entries()) {
        const blob = await compressImage(f, 1800);
        const path = `${Date.now()}-${i}.jpg`;
        const { error: up } = await supabase.storage.from('portfolio').upload(path, blob, { contentType: 'image/jpeg' });
        if (up) throw up;
        const { error } = await supabase.from('portfolio').insert({ title: title.trim() || f.name.replace(/\.[^.]+$/, ''), description: desc.trim() || null, category: cat, image_path: path });
        if (error) throw error;
      }
      setFiles([]); setTitle(''); setDesc(''); load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const remove = async (p: PortfolioItem) => {
    if (!confirm(`Delete “${p.title}”? This removes it from the website.`)) return;
    await supabase.storage.from('portfolio').remove([p.image_path]);
    const { error } = await supabase.from('portfolio').delete().eq('id', p.id);
    if (error) setErr(error.message); else load();
  };

  return (
    <>
      <PageTitle title="Our Work" sub="Add and delete the pictures shown on the public website." />
      <form onSubmit={upload} className="card mb-8 space-y-4 p-5">
        <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gold/60 p-8 text-center hover:bg-gold-50">
          <ImagePlus className="h-10 w-10 text-gold-600" />
          <b className="mt-2">{files.length ? `${files.length} picture(s) selected` : 'Tap to choose pictures'}</b>
          <span className="text-sm text-forest-500">You can select many at once</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deep clean – Ruiru" /></div>
          <div><label className="label">Short caption</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><label className="label">Category</label><select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{Object.entries(categoryMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        {err && <Alert>{err}</Alert>}
        <button className="btn-primary" disabled={busy}><Upload className="h-4 w-4" />{busy ? 'Uploading…' : 'Add to Our Work'}</button>
      </form>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty icon={ImagePlus} title="No pictures yet" text="Upload your first pictures above." /> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((p) => (
            <div key={p.id} className="card group relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicUrl('portfolio', p.image_path)} alt={p.title} className="aspect-square w-full object-cover" />
              <div className="p-3"><p className="truncate font-semibold">{p.title}</p><p className="text-xs text-forest-400">{categoryMeta[p.category]?.label || p.category}</p></div>
              <button onClick={() => remove(p)} className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white shadow" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
