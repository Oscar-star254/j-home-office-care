'use client';
import { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Alert, RoleBadge, compressImage, Stars } from './ui';
import { normalizeKePhone } from '@/lib/utils';

export function ProfileForm() {
  const { profile, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone ? '0' + profile.phone.replace(/^254/, '') : '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [msg, setMsg] = useState<{ k: 'success' | 'error'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;
  const isEmp = profile.role === 'employee';

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    const p = normalizeKePhone(phone);
    if (!p) return setMsg({ k: 'error', t: 'Enter a valid Kenyan phone number.' });
    setBusy(true);
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: p, bio: bio.trim() || null, location: location.trim() || null }).eq('id', profile.id);
    setBusy(false);
    if (error) setMsg({ k: 'error', t: error.message }); else { setMsg({ k: 'success', t: 'Profile saved.' }); refresh(); }
  };

  const avatar = async (f: File) => {
    try {
      const blob = await compressImage(f, 600);
      const path = `${profile.id}/avatar.jpg`;
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      refresh();
    } catch (e: any) { setMsg({ k: 'error', t: e.message }); }
  };

  return (
    <form onSubmit={save} className="card mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-forest text-3xl font-bold text-gold">{profile.full_name[0]}</span>}
          <span className="absolute -bottom-1 -right-1 rounded-full bg-gold p-1.5 text-forest-900"><Camera className="h-4 w-4" /></span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && avatar(e.target.files[0])} />
        </label>
        <div><RoleBadge role={profile.role} /><p className="mt-1 text-sm text-forest-500">{profile.email}</p>{isEmp && <Stars value={profile.rating_avg} count={profile.rating_count} />}</div>
      </div>
      <div><label className="label">Full name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><label className="label">Phone number</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
      {(isEmp || profile.role === 'customer') && <div><label className="label">{isEmp ? 'Area you work in' : 'Your usual area'}</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} /></div>}
      {isEmp && <div><label className="label">About you (customers see this)</label><textarea className="input min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={400} placeholder="Years of experience, what you do best…" /></div>}
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <button className="btn-primary" disabled={busy}><Save className="h-4 w-4" />{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}
