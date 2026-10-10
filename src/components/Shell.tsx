'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import {
  LayoutDashboard, CalendarCheck, UserCircle, LogOut, Bell, Briefcase, Users, UserCheck, Images, Wrench,
  CreditCard, ClipboardList, Settings, Menu, X, Home,
} from 'lucide-react';
import { useAuth, homeFor } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Logo } from './Logo';
import { RoleBadge, Spinner } from './ui';
import { InstallButton } from './PWA';
import type { Notice, Role } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

const NAV: Record<Role, { href: string; label: string; icon: any }[]> = {
  customer: [
    { href: '/customer', label: 'Home', icon: LayoutDashboard },
    { href: '/customer/bookings', label: 'My Bookings', icon: CalendarCheck },
    { href: '/customer/profile', label: 'My Profile', icon: UserCircle },
  ],
  employee: [
    { href: '/employee', label: 'Overview', icon: LayoutDashboard },
    { href: '/employee/jobs', label: 'My Jobs', icon: Briefcase },
    { href: '/employee/profile', label: 'My Profile', icon: UserCircle },
  ],
  admin: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/approvals', label: 'Approvals', icon: UserCheck },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
    { href: '/admin/payments', label: 'Payments', icon: CreditCard },
    { href: '/admin/portfolio', label: 'Our Work', icon: Images },
    { href: '/admin/services', label: 'Services', icon: Wrench },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

/** Protects a section: only the right kind of user gets in. */
export function Guard({ role, children, allowUnverified = false }: { role: Role; children: ReactNode; allowUnverified?: boolean }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace(`/login?next=${encodeURIComponent(path)}`); return; }
    if (!profile) return;
    if (profile.role !== role) { router.replace(homeFor(profile)); return; }
    if (role === 'employee' && !allowUnverified) {
      const home = homeFor(profile);
      if (home !== '/employee') router.replace(home);
    }
  }, [loading, session, profile, role, router, path, allowUnverified]);

  if (loading || !session || !profile || profile.role !== role) return <div className="min-h-screen"><Spinner /></div>;
  if (role === 'employee' && !allowUnverified && homeFor(profile) !== '/employee') return <div className="min-h-screen"><Spinner /></div>;
  return <>{children}</>;
}

function Bell_() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;
    const load = () => supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(15)
      .then(({ data }) => setItems((data as Notice[]) || []));
    load();
    const ch = supabase.channel('notif-' + profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile]);

  const unread = items.filter((i) => !i.read).length;
  const markAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile!.id).eq('read', false);
    setItems((x) => x.map((i) => ({ ...i, read: true })));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-full p-2 hover:bg-forest-50" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[85vw] rounded-2xl border border-gold/30 bg-white p-2 shadow-card">
          <div className="flex items-center justify-between px-3 py-2">
            <b className="font-display uppercase text-forest">Notifications</b>
            {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-gold-600">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-forest-400">Nothing yet.</p>}
            {items.map((n) => (
              <button key={n.id} onClick={() => { setOpen(false); if (n.link) router.push(n.link); }}
                className={`block w-full rounded-xl px-3 py-2 text-left hover:bg-forest-50 ${n.read ? '' : 'bg-gold-50'}`}>
                <span className="block text-sm font-semibold">{n.title}</span>
                {n.body && <span className="block text-xs text-forest-500">{n.body}</span>}
                <span className="text-[11px] text-forest-400">{timeAgo(n.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const nav = NAV[role];
  const active = (href: string) => (href === `/${role}` ? path === href : path.startsWith(href));

  const Links = () => (
    <nav className="space-y-1">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setMenu(false)}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition ${active(n.href) ? 'bg-gold text-forest-900' : 'text-white/85 hover:bg-white/10'}`}>
          <n.icon className="h-5 w-5" /> {n.label}
        </Link>
      ))}
    </nav>
  );

  const Side = () => (
    <div className="flex h-full flex-col bg-forest p-5">
      <Link href="/" className="mb-8 block"><Logo light size={40} /></Link>
      <Links />
      <div className="mt-auto space-y-3 border-t border-white/15 pt-4">
        <div className="text-sm text-white/80">
          <p className="truncate font-semibold text-white">{profile?.full_name}</p>
          <p className="truncate text-xs">{profile?.email}</p>
        </div>
        <Link href="/" className="flex items-center gap-2 text-sm text-white/70 hover:text-white"><Home className="h-4 w-4" /> Public website</Link>
        <button onClick={async () => { await signOut(); router.replace('/'); }} className="flex items-center gap-2 text-sm font-semibold text-gold-200 hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Side /></aside>
      {menu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-72"><Side /></div>
        </div>
      )}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gold/20 bg-cream/90 px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 hover:bg-forest-50 lg:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
          <RoleBadge role={role} />
        </div>
        <div className="flex items-center gap-2"><InstallButton /><Bell_ /></div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
