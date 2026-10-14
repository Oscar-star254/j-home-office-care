'use client';
import { ReactNode, useEffect, useState } from 'react';
import {
  Search, Sparkles, SprayCan, Home, Building2, LayoutGrid, Shirt, Baby, Footprints, Utensils, ShoppingBasket,
  Armchair, ShieldCheck, User, BriefcaseBusiness, Star, Loader2, CheckCircle2, AlertCircle, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const iconMap: Record<string, any> = {
  'search-home': Search, sparkles: Sparkles, spray: SprayCan, home: Home, building: Building2, carpet: LayoutGrid,
  sofa: Armchair, utensils: Utensils, shirt: Shirt, basket: ShoppingBasket, baby: Baby, run: Footprints,
};
export function ServiceIcon({ name, className = 'h-6 w-6' }: { name: string; className?: string }) {
  const I = iconMap[name] || Sparkles;
  return <I className={className} />;
}

// One clear icon + colour per kind of user
export const roleMeta = {
  admin:    { label: 'Admin',    Icon: ShieldCheck,       cls: 'bg-gold text-forest-900' },
  customer: { label: 'Customer', Icon: User,              cls: 'bg-forest-100 text-forest-700' },
  employee: { label: 'Employee', Icon: BriefcaseBusiness, cls: 'bg-forest text-white' },
} as const;

export function RoleBadge({ role }: { role: 'admin' | 'customer' | 'employee' }) {
  const m = roleMeta[role];
  return <span className={`badge inline-flex items-center gap-1 ${m.cls}`}><m.Icon className="h-3.5 w-3.5" />{m.label}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-forest-500">
      <Loader2 className="h-5 w-5 animate-spin" /> {label || 'Loading…'}
    </div>
  );
}

export function Stars({ value, count, size = 'h-4 w-4' }: { value: number; count?: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-gold text-gold' : 'text-gray-300'}`} />
        ))}
      </span>
      {count !== undefined && (
        <span className="text-forest-500">{count > 0 ? `${Number(value).toFixed(1)} (${count})` : 'New'}</span>
      )}
    </span>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = { error: 'bg-red-50 text-red-700 border-red-200', success: 'bg-green-50 text-green-700 border-green-200', info: 'bg-gold-50 text-gold-700 border-gold-200' }[kind];
  const I = kind === 'success' ? CheckCircle2 : AlertCircle;
  return <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${cls}`}><I className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl text-forest">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-forest-50" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon: I, title, text }: { icon: any; title: string; text?: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 rounded-full bg-forest-50 p-4 text-forest-400"><I className="h-8 w-8" /></span>
      <p className="font-display text-xl text-forest">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-forest-500">{text}</p>}
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl text-forest md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-forest-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// Public URL helper for the portfolio / avatars buckets
export const publicUrl = (bucket: string, path: string) => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

// Signed URL for private ID photos
export function useSignedUrl(bucket: string, path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    supabase.storage.from(bucket).createSignedUrl(path, 300).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [bucket, path]);
  return url;
}

// Resize a photo in the browser before upload (keeps uploads fast on mobile data)
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not process image'))), 'image/jpeg', quality));
}
