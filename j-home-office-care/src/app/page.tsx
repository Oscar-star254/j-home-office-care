'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Phone, Mail, ShieldCheck, Clock, ThumbsUp, UserCheck, ArrowRight, MessageCircle, Wallet, Star, Music2, User, BriefcaseBusiness } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, homeFor } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { ServiceIcon, publicUrl } from '@/components/ui';
import { categoryMeta, ksh, unitLabel } from '@/lib/utils';
import type { PortfolioItem, Service } from '@/lib/types';

const Facebook = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" /></svg>
);
const Instagram = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
);

const PHONE = '0707 089 523';
const EMAIL = 'jhomeandofficecare@gmail.com';

export default function Landing() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [work, setWork] = useState<PortfolioItem[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true).order('sort_order').then(({ data }) => setServices((data as Service[]) || []));
    supabase.from('portfolio').select('*').order('created_at', { ascending: false }).limit(24).then(({ data }) => setWork((data as PortfolioItem[]) || []));
  }, []);

  const cats = Array.from(new Set(work.map((w) => w.category)));
  const shown = filter === 'all' ? work : work.filter((w) => w.category === filter);

  return (
    <div>
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/"><Logo size={42} /></Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#services" className="hover:text-gold-600">Services</a>
            <a href="#how" className="hover:text-gold-600">How it works</a>
            <a href="#work" className="hover:text-gold-600">Our Work</a>
            <a href="#contact" className="hover:text-gold-600">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            {profile ? <Link href={homeFor(profile)} className="btn-primary !py-2">My dashboard</Link> : (
              <>
                <Link href="/login" className="btn-ghost !py-2">Sign in</Link>
                <Link href="/signup" className="btn-primary hidden !py-2 sm:inline-flex">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-forest text-white">
        <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full border-[40px] border-gold/25" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full border-[30px] border-gold/15" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="font-script text-4xl text-gold-300">We clean, You relax.</p>
            <h1 className="mt-2 text-5xl leading-[1.05] md:text-7xl">Home &amp; office <span className="text-gold">care</span>, done for you.</h1>
            <p className="mt-5 max-w-lg text-lg text-white/80">Cleaning, laundry, baby sitting, house hunting and errands. Choose your own trusted, rated provider and book in minutes.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={profile ? homeFor(profile) : '/signup'} className="btn-gold">Book a service <ArrowRight className="h-5 w-5" /></Link>
              <a href="#services" className="btn border border-white/40 text-white hover:bg-white/10">See services &amp; rates</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" /> ID-verified providers</span>
              <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-gold" /> Real customer ratings</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold" /> Saves you time</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { n: 'House Hunting', i: 'search-home', big: true }, { n: 'Cleaning', i: 'sparkles', big: true },
              { n: 'Laundry', i: 'shirt' }, { n: 'Errands', i: 'run' },
            ].map((c) => (
              <div key={c.n} className={`rounded-3xl border border-gold/40 bg-white/10 p-5 backdrop-blur ${c.big ? 'row-span-1 min-h-40' : ''}`}>
                <ServiceIcon name={c.i} className="h-9 w-9 text-gold" />
                <p className="mt-4 font-display text-2xl uppercase">{c.n}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-4xl uppercase text-forest md:text-5xl">Our services &amp; rates</h2>
        <p className="mb-10 text-center text-forest-500">Transparent prices in Kenya shillings.</p>
        <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-gold/25 bg-white p-4">
              <span className="rounded-full bg-forest p-3 text-gold"><ServiceIcon name={s.icon} /></span>
              <div className="min-w-0 flex-1"><p className="font-display text-xl uppercase leading-tight">{s.name}</p><p className="truncate text-sm text-forest-500">{categoryMeta[s.category]?.label}</p></div>
              <div className="text-right"><p className="text-xs text-forest-500">{s.price_note}</p><p className="font-display text-xl text-forest">{ksh(s.base_price)}</p>{unitLabel[s.price_unit] && <p className="text-xs text-forest-500">{unitLabel[s.price_unit]}</p>}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 rounded-2xl bg-forest p-4 text-center font-semibold text-white">🚚 FREE pick up &amp; delivery for Laundry and Carpet Cleaning</p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-forest-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-4xl uppercase text-forest md:text-5xl">How it works</h2>
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { i: UserCheck, t: '1. Create an account', p: 'Sign up as a customer and confirm your email.' },
              { i: Star, t: '2. Pick service & provider', p: 'Describe what you need and choose a provider by their rating.' },
              { i: Wallet, t: '3. Pay a small deposit', p: 'Services from KSh 1,000 need 10%. Others just KSh 100.' },
              { i: MessageCircle, t: '4. Chat & relax', p: 'Chat unlocks after the deposit so you can agree the details.' },
            ].map((s) => (
              <div key={s.t} className="card p-6"><span className="inline-flex rounded-2xl bg-forest p-3 text-gold"><s.i className="h-6 w-6" /></span><h3 className="mt-4 text-xl uppercase">{s.t}</h3><p className="mt-1 text-sm text-forest-500">{s.p}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* OUR WORK */}
      <section id="work" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-4xl uppercase text-forest md:text-5xl">Our work</h2>
        <p className="mb-8 text-center text-forest-500">A look at the spaces we have cared for.</p>
        {work.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gold/50 p-10 text-center text-forest-400">Photos of our work will appear here soon.</p>
        ) : (
          <>
            {cats.length > 1 && (
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {['all', ...cats].map((c) => (
                  <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${filter === c ? 'border-forest bg-forest text-white' : 'border-forest/25 hover:bg-forest-50'}`}>
                    {c === 'all' ? 'All' : categoryMeta[c]?.label || c}
                  </button>
                ))}
              </div>
            )}
            <div className="columns-2 gap-4 space-y-4 md:columns-3">
              {shown.map((w) => (
                <figure key={w.id} className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-gold/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl('portfolio', w.image_path)} alt={w.title} className="w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-900/90 to-transparent p-3 text-sm text-white">
                    <b className="block font-display uppercase tracking-wide">{w.title}</b>{w.description}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>

      {/* THREE KINDS OF USERS */}
      <section className="bg-forest py-16 text-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gold/40 p-8"><User className="h-10 w-10 text-gold" /><h3 className="mt-3 text-3xl uppercase">I need a service</h3><p className="mt-2 text-white/75">Create a free customer account and book trusted providers.</p><Link href="/signup" className="btn-gold mt-5">Sign up as customer</Link></div>
          <div className="rounded-3xl border border-gold/40 p-8"><BriefcaseBusiness className="h-10 w-10 text-gold" /><h3 className="mt-3 text-3xl uppercase">I want to work</h3><p className="mt-2 text-white/75">Apply to join our team. We verify every employee before approval.</p><Link href="/signup/employee" className="btn-gold mt-5">Apply as employee</Link></div>
        </div>
      </section>

      {/* CONTACT */}
      <footer id="contact" className="bg-forest-900 py-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div><Logo light /><p className="mt-3 font-script text-3xl text-gold-300">We clean, You relax.</p></div>
          <div className="space-y-2">
            <p className="font-display text-xl uppercase text-gold">Call / WhatsApp</p>
            <a href={`tel:${PHONE.replace(/\s/g, '')}`} className="flex items-center gap-2 text-2xl font-bold"><Phone className="h-5 w-5 text-gold" />{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-white/80"><Mail className="h-4 w-4 text-gold" />{EMAIL}</a>
          </div>
          <div>
            <p className="font-display text-xl uppercase text-gold">Follow us</p>
            <p className="mt-2 flex items-center gap-4 text-white/80"><Facebook className="h-5 w-5" /><Music2 className="h-5 w-5" /><Instagram className="h-5 w-5" /> @jhomeandofficecare</p>
            <p className="mt-1 text-sm text-white/60">Facebook: J Home &amp; Office Care</p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-white/50">© {new Date().getFullYear()} J Home &amp; Office Care. All rights reserved.</p>
      </footer>
    </div>
  );
}
