'use client';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Share2, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { LogoMark } from './Logo';
import { ksh, unitLabel } from '@/lib/utils';
import type { Booking } from '@/lib/types';

/* ------------------------------------------------------------------ data */
export interface ReceiptData {
  receiptNo: string; bookingRef: string; serviceName: string; quantity: number; unitPrice: number; unitNote: string;
  customerName: string; providerName: string; address: string; scheduledDate: string | null; scheduledTime: string | null;
  completedAt: string; price: number; depositLabel: string;
  deposit: { amount: number; code: string; date: string; phone: string | null };
  balance: { amount: number; code: string; date: string; phone: string | null };
  details: Record<string, any>;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export function buildReceipt(b: Booking, payments: any[], customerName: string, providerName: string): ReceiptData {
  const dep = payments.find((p) => p.kind === 'deposit');
  const bal = payments.find((p) => p.kind === 'balance');
  const svc = b.services!;
  const balanceAmt = Math.max(b.estimated_price - b.deposit_amount, 0);
  return {
    receiptNo: b.receipt_no || `JHC-${b.reference}`, bookingRef: b.reference,
    serviceName: svc.name, quantity: b.quantity, unitPrice: svc.base_price, unitNote: unitLabel[svc.price_unit] || '',
    customerName, providerName, address: b.address, scheduledDate: b.scheduled_date, scheduledTime: b.scheduled_time,
    completedAt: fmt(b.completed_at || bal?.created_at || b.created_at), price: b.estimated_price,
    depositLabel: b.estimated_price >= 1000 ? 'Deposit (10%)' : 'Deposit (flat)',
    deposit: { amount: b.deposit_amount, code: dep?.mpesa_receipt || 'RECORDED', date: fmt(dep?.created_at || b.created_at), phone: dep?.phone || null },
    balance: { amount: balanceAmt, code: bal?.mpesa_receipt || (balanceAmt ? 'RECORDED' : 'N/A'), date: fmt(bal?.created_at || b.completed_at), phone: bal?.phone || null },
    details: b.details || {},
  };
}

/* --------------------------------------------------------------- helpers */
const PRINT_MS = 6500;
const maskPhone = (p: string | null) => (p ? `${'0' + p.replace(/^254/, '')}`.replace(/^(\d{4})\d+(\d{3})$/, '$1 *** $2') : '—');

// zig-zag torn paper edge, top and bottom
const ZIGZAG = (() => {
  const n = 17; const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${i % 2 ? '0' : '7px'}`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${i % 2 ? '100%' : 'calc(100% - 7px)'}`);
  return `polygon(${pts.join(',')})`;
})();

// mechanical printer sound: dot-matrix style ticks while feeding, then a cutter "chunk"
function startPrinterSound(ms: number): () => void {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return () => {};
    const ctx: AudioContext = new AC();
    ctx.resume?.().catch(() => {});
    const burst = (gain: number, dur: number, freq: number) => {
      if (ctx.state !== 'running') return;   // browser blocks sound until the user has tapped something
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
      const g = ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    };
    const tick = setInterval(() => burst(0.35 + Math.random() * 0.15, 0.025, 1800 + Math.random() * 1400), 70);
    const cut = setTimeout(() => { clearInterval(tick); burst(0.6, 0.2, 800); }, ms);
    return () => { clearInterval(tick); clearTimeout(cut); setTimeout(() => ctx.close().catch(() => {}), 400); };
  } catch { return () => {}; }
}

/* ---------------------------------------------------------- paper pieces */
const Hr = ({ strong }: { strong?: boolean }) => <div className={`my-2.5 border-t border-neutral-500 ${strong ? 'border-t-[3px] border-double' : 'border-dashed'}`} />;
const Row = ({ l, r, b }: { l: ReactNode; r: ReactNode; b?: boolean }) => (
  <div className={`flex justify-between gap-3 ${b ? 'font-bold' : ''}`}><span>{l}</span><span className="text-right">{r}</span></div>
);
const Sub = ({ children }: { children: ReactNode }) => <p className="text-[10.5px] text-neutral-500">{children}</p>;

function Barcode({ value }: { value: string }) {
  const { bars, width } = useMemo(() => {
    const out: { x: number; w: number }[] = []; let x = 6;
    out.push({ x, w: 2 }, { x: x + 4, w: 1 }); x += 8;
    for (const ch of value) {
      const c = ch.charCodeAt(0);
      for (let i = 0; i < 6; i++) { const w = (c >> i) & 1 ? 3 : 1; if (i % 2 === 0) out.push({ x, w }); x += w + 1; }
      x += 2;
    }
    out.push({ x, w: 1 }, { x: x + 3, w: 2 }); x += 8;
    return { bars: out, width: x + 6 };
  }, [value]);
  return (
    <svg viewBox={`0 0 ${width} 44`} className="mx-auto h-11 w-full" preserveAspectRatio="none" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={44} fill="#222" />)}
    </svg>
  );
}

function Paper({ d, stamped, print }: { d: ReceiptData; stamped: boolean; print?: boolean }) {
  const total = d.deposit.amount + d.balance.amount;
  const detailEntries = Object.entries(d.details).filter(([, v]) => v !== '' && v != null).slice(0, 12);
  return (
    <div className="relative bg-[#fffef8] px-5 pb-8 pt-7 font-mono text-[11.5px] leading-[1.5] text-neutral-800" style={{ clipPath: ZIGZAG, fontFamily: "'Courier New', ui-monospace, monospace" }}>
      {/* letterhead */}
      <div className="flex flex-col items-center text-center">
        <LogoMark size={56} />
        <p className="mt-1 text-[20px] font-bold uppercase leading-5 tracking-wide text-[#0f3d1e]" style={{ fontFamily: 'Oswald, Impact, sans-serif' }}>J Home &amp; Office Care</p>
        <p className="italic text-[#b07f10]">We clean, You relax.</p>
        <p className="mt-2">Tel / WhatsApp: 0707 089 523</p>
        <p>jhomeandofficecare@gmail.com</p>
        <p>Facebook: J Home &amp; Office Care</p>
        <p>Instagram &amp; TikTok: @jhomeandofficecare</p>
      </div>
      <Hr strong />
      <p className="text-center text-[13px] font-bold tracking-[.3em]">PAYMENT RECEIPT</p>
      <Hr />
      <Row l="Receipt No." r={<b>{d.receiptNo}</b>} />
      <Row l="Booking Ref" r={d.bookingRef} />
      <Row l="Issued" r={d.completedAt} />
      <Row l="Job status" r="COMPLETED" />
      <Hr />

      <p className="font-bold">CUSTOMER &amp; PROVIDER</p>
      <Row l="Customer" r={d.customerName} />
      <Row l="Served by" r={d.providerName} />
      <Row l="Service date" r={`${d.scheduledDate || '—'} ${d.scheduledTime || ''}`} />
      <p className="mt-0.5">Location:</p>
      <p className="pl-2">{d.address}</p>
      <Hr />

      <p className="font-bold">SERVICE</p>
      <Row l={d.serviceName} r={ksh(d.price)} b />
      <Sub>{d.quantity} × {ksh(d.unitPrice)} {d.unitNote}</Sub>
      {detailEntries.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {detailEntries.map(([k, v]) => <p key={k} className="text-[10.5px] text-neutral-600">· {k}: {String(v)}</p>)}
        </div>
      )}
      <Hr />

      <p className="font-bold">PAYMENT SUMMARY</p>
      <Row l="Service price" r={ksh(d.price)} />
      <Row l={d.depositLabel} r={ksh(d.deposit.amount)} />
      <Sub>M-Pesa {d.deposit.code} · {d.deposit.date}</Sub>
      <Row l="Balance" r={ksh(d.balance.amount)} />
      <Sub>M-Pesa {d.balance.code} · {d.balance.date}</Sub>
      <Hr strong />
      <Row l={<span className="text-[14px] font-bold">TOTAL PAID</span>} r={<span className="text-[14px] font-bold">{ksh(total)}</span>} />
      <Row l="Amount due" r={ksh(0)} />
      <p className="mt-1">Method: M-PESA ({maskPhone(d.balance.phone || d.deposit.phone)})</p>

      <div className="my-4 flex justify-center">
        <span
          className={`inline-block rounded border-[3px] border-double border-green-700 px-3 py-1 text-[17px] font-extrabold tracking-[.2em] text-green-700 ${stamped ? (print ? '-rotate-[8deg]' : 'stamp-in') : 'opacity-0'}`}
        >PAID IN FULL</span>
      </div>

      <Barcode value={d.receiptNo} />
      <p className="mt-1 text-center text-[10.5px] tracking-widest">{d.receiptNo}</p>
      <Hr />
      <div className="text-center">
        <p className="text-[12.5px] font-bold">THANK YOU FOR CHOOSING US!</p>
        <p>Your time is valuable. We run, You relax.</p>
        <p className="mt-1 text-[10.5px] text-neutral-500">Please rate your provider in the app.</p>
        <p className="text-[10.5px] text-neutral-500">Keep this receipt as proof of payment.</p>
        <p className="mt-2 text-[10px] text-neutral-400">*** Computer generated. No signature required. ***</p>
        <p className="text-[10px] text-neutral-400">Printed {fmt(new Date().toISOString())}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- the printer */
export function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const [phase, setPhase] = useState<'printing' | 'done'>('printing');
  const [run, setRun] = useState(0);
  const [sound, setSound] = useState(true);
  const [mounted, setMounted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ms = reduced ? 400 : PRINT_MS;
  const steps = Math.max(Math.round(ms / 75), 4);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [onClose]);

  // print run: keep the view pinned at the printer slot while paper feeds out, then reveal the top
  useEffect(() => {
    setPhase('printing');
    const el = scroller.current;
    const pin = () => { if (el) el.scrollTop = el.scrollHeight; };
    pin(); const raf = requestAnimationFrame(pin); const iv = setInterval(pin, 100);
    const stopSound = sound && !reduced ? startPrinterSound(ms) : () => {};
    const t = setTimeout(() => { clearInterval(iv); setPhase('done'); }, ms + 150);
    return () => { clearInterval(iv); clearTimeout(t); cancelAnimationFrame(raf); stopSound(); };
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }), 700);
    return () => clearTimeout(t);
  }, [phase]);

  const share = () => {
    const text = `J Home & Office Care receipt ${data.receiptNo}\n${data.serviceName}\nTotal paid: ${ksh(data.deposit.amount + data.balance.amount)} (M-Pesa)\nThank you! We clean, You relax.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const printing = phase === 'printing';
  const btn = 'inline-flex items-center gap-1.5 rounded-lg border border-gold/50 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-white/15 disabled:opacity-40';

  return (
    <>
      <div className="fixed inset-0 z-[70] flex flex-col bg-[#071c0f]" role="dialog" aria-modal="true" aria-label="Receipt">
        <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Close receipt"><X className="h-5 w-5" /></button>

        {/* paper area */}
        <div ref={scroller} className={`min-h-0 flex-1 ${printing ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className="flex min-h-full flex-col justify-end px-3 pt-14">
            <div key={run} className="mx-auto w-[min(350px,94vw)] overflow-hidden [filter:drop-shadow(0_8px_14px_rgba(0,0,0,.5))]">
              <div className="paper-feed" style={{ animationDuration: `${ms}ms`, animationTimingFunction: `steps(${steps}, end)` }}>
                <Paper d={data} stamped={!printing} />
              </div>
            </div>
          </div>
        </div>

        {/* printer body */}
        <div className={`relative shrink-0 border-t-4 border-gold bg-gradient-to-b from-[#22382b] to-[#0b1a11] px-4 pb-4 ${printing ? 'printer-shake' : ''}`}>
          <div className="relative z-10 mx-auto -mt-2 h-3.5 w-[min(380px,97vw)] rounded-b-xl rounded-t-sm bg-black ring-1 ring-gold/70 shadow-[inset_0_-3px_6px_rgba(255,255,255,.08)]" />
          <div className="mx-auto mt-3 max-w-md">
            <div className="rounded-lg border border-gold/40 bg-[#0b2415] px-3 py-2 font-mono text-[11px] text-green-300 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="tracking-widest">J HOME POS-80</span>
                <span className="flex items-center gap-1.5">
                  <i className={`inline-block h-2.5 w-2.5 rounded-full ${printing ? 'led-blink bg-amber-400' : 'bg-green-400'}`} />
                  {printing ? 'PRINTING…' : 'RECEIPT READY'}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-white/10">
                <div key={run} className="bar-feed h-full bg-green-400" style={{ animationDuration: `${ms}ms`, animationTimingFunction: `steps(${steps}, end)` }} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button className={`${btn} !bg-gold !text-[#061c0e] hover:!bg-gold-400`} onClick={() => window.print()} disabled={printing}><Printer className="h-4 w-4" />Print / Save PDF</button>
              <button className={btn} onClick={share} disabled={printing}><Share2 className="h-4 w-4" />WhatsApp</button>
              <button className={btn} onClick={() => setRun((n) => n + 1)} disabled={printing}><RotateCcw className="h-4 w-4" />Reprint</button>
              <button className={btn} onClick={() => setSound((s) => !s)} aria-label={sound ? 'Mute printer sound' : 'Unmute printer sound'}>{sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
            </div>
          </div>
        </div>
      </div>

      {/* hidden copy that is the only thing shown when printing (80mm thermal-style) */}
      {mounted && createPortal(<div className="print-only"><Paper d={data} stamped print /></div>, document.body)}
    </>
  );
}
