'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, IdCard, Camera, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Guard } from '@/components/Shell';
import { AuthFrame } from '@/components/AuthFrame';
import { Alert, compressImage } from '@/components/ui';

function Pick({ label, hint, icon: I, file, onFile }: { label: string; hint: string; icon: any; file: File | null; onFile: (f: File) => void }) {
  return (
    <label className={`card flex cursor-pointer items-center gap-4 p-4 transition hover:border-gold ${file ? 'border-forest' : ''}`}>
      <span className={`rounded-xl p-3 ${file ? 'bg-forest text-white' : 'bg-forest-50 text-forest'}`}>{file ? <CheckCircle2 className="h-6 w-6" /> : <I className="h-6 w-6" />}</span>
      <span className="min-w-0 flex-1"><b className="block">{label}</b><span className="block truncate text-sm text-forest-500">{file ? file.name : hint}</span></span>
      <span className="btn-ghost !px-3 !py-1.5 text-sm"><Upload className="h-4 w-4" />{file ? 'Change' : 'Choose'}</span>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}

function Onboarding() {
  const { profile, refresh } = useAuth();
  const router = useRouter();
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');

  const submit = async () => {
    if (!front || !back || !selfie) return setErr('Please add all three photos.');
    setBusy(true); setErr('');
    try {
      const uid = profile!.id;
      const up = async (bucket: string, path: string, file: File) => {
        const blob = await compressImage(file);
        const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
        if (error) throw error;
      };
      await up('ids', `${uid}/front.jpg`, front);
      await up('ids', `${uid}/back.jpg`, back);
      await up('avatars', `${uid}/avatar.jpg`, selfie);
      const avatar = supabase.storage.from('avatars').getPublicUrl(`${uid}/avatar.jpg`).data.publicUrl + `?v=${Date.now()}`;
      const { error } = await supabase.from('profiles').update({ id_photo_path: `${uid}/front.jpg`, id_submitted: true, avatar_url: avatar }).eq('id', uid);
      if (error) throw error;
      await refresh();
      router.replace('/employee/pending');
    } catch (e: any) { setErr(e.message || 'Upload failed. Try again.'); }
    setBusy(false);
  };

  return (
    <AuthFrame wide title="Verify your identity" sub="Photos must be clear and readable. Only our admin can see your ID — customers never do.">
      <div className="space-y-3">
        <Pick label="ID card — front" hint="Clear, well-lit, all corners visible" icon={IdCard} file={front} onFile={setFront} />
        <Pick label="ID card — back" hint="Clear, well-lit, all corners visible" icon={IdCard} file={back} onFile={setBack} />
        <Pick label="Your profile photo" hint="A friendly face photo customers will see" icon={Camera} file={selfie} onFile={setSelfie} />
        {err && <Alert>{err}</Alert>}
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>{busy ? 'Uploading…' : 'Submit for approval'}</button>
      </div>
    </AuthFrame>
  );
}
export default function Page() { return <Guard role="employee" allowUnverified><Onboarding /></Guard>; }
