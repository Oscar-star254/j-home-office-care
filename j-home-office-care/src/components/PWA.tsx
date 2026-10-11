'use client';
import { useEffect, useState } from 'react';
import { Download, MoreVertical, PlusSquare, Share } from 'lucide-react';
import { Modal } from './ui';

// The browser fires "beforeinstallprompt" once, often before React is ready, so keep it at module level.
let deferred: any = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Mount once (in the root layout): registers the service worker and captures the install prompt. */
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e: Event) => { e.preventDefault(); deferred = e; notify(); };
    const onInstalled = () => { deferred = null; notify(); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  return null;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function InstallButton({ className = '' }: { className?: string }) {
  const [, force] = useState(0);
  const [installed, setInstalled] = useState(true);   // hidden until we know
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const l = () => { force((n) => n + 1); setInstalled(isStandalone()); };
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  if (installed) return null;

  const click = async () => {
    if (deferred) {
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      if (choice?.outcome === 'accepted') { deferred = null; setInstalled(true); }
      return;
    }
    setHelp(true);   // iOS and browsers without the install prompt: show instructions
  };

  return (
    <>
      <button onClick={click} className={`btn-gold !px-4 !py-2 text-sm ${className}`} aria-label="Install the J Home app">
        <Download className="h-4 w-4" /><span>Install app</span>
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title="Install the app">
        {ios ? (
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3"><Share className="h-6 w-6 shrink-0 text-gold-600" /><span>Open this site in <b>Safari</b>, then tap the <b>Share</b> button at the bottom of the screen.</span></li>
            <li className="flex gap-3"><PlusSquare className="h-6 w-6 shrink-0 text-gold-600" /><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
            <li className="flex gap-3"><Download className="h-6 w-6 shrink-0 text-gold-600" /><span>Tap <b>Add</b>. The J Home icon now sits on your home screen.</span></li>
          </ol>
        ) : (
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3"><MoreVertical className="h-6 w-6 shrink-0 text-gold-600" /><span>Open your browser menu (the <b>⋮</b> or <b>⋯</b> button).</span></li>
            <li className="flex gap-3"><PlusSquare className="h-6 w-6 shrink-0 text-gold-600" /><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li>
            <li className="flex gap-3"><Download className="h-6 w-6 shrink-0 text-gold-600" /><span>Confirm. The J Home icon now sits on your home screen or desktop.</span></li>
          </ol>
        )}
        <button className="btn-primary mt-6 w-full" onClick={() => setHelp(false)}>Got it</button>
      </Modal>
    </>
  );
}
