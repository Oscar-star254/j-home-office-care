'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Phone, Mail, Music2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, homeFor } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { InstallButton } from '@/components/PWA';
import { publicUrl } from '@/components/ui';
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

const ORDER = ['house_hunting', 'cleaning', 'laundry', 'care', 'errands'];

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
  const groups = ORDER.map((c) => ({ c, items: services.filter((s) => s.category === c) })).filter((g) => g.items.length);
  const tel = `tel:${PHONE.replace(/\s/g, '')}`;
  const wa = `https://wa.me/254${PHONE.replace(/\s/g, '').slice(1)}`;

  return (
    <div>
      {/* contact strip */}
      <div className="bg-forest-900 text-sm text-white/85">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-1.5">
          <span>Call or WhatsApp <a href={tel} className="font-semibold text-gold-300">{PHONE}</a></span>
          <a href={`mailto:${EMAIL}`} className="hidden sm:inline">{EMAIL}</a>
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link href="/"><Logo size={42} /></Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#services" className="hover:text-gold-600">Prices</a>
            <a href="#how" className="hover:text-gold-600">How booking works</a>
            <a href="#work" className="hover:text-gold-600">Our work</a>
            <a href="#contact" className="hover:text-gold-600">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <InstallButton />
            {profile ? <Link href={homeFor(profile)} className="btn-primary !py-2">My dashboard</Link> : (
              <>
                <Link href="/login" className="btn-ghost !py-2">Sign in</Link>
                <Link href="/signup" className="btn-primary hidden !py-2 sm:inline-flex">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO — team photo behind the text */}
      <section className="relative overflow-hidden bg-forest text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-team.jpg" alt="The J Home & Office Care team with their van and cleaning equipment" className="h-56 w-full object-cover object-[50%_30%] md:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-team-wide.jpg" alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover object-[right_top] md:block" />
        <div className="relative mx-auto flex max-w-6xl items-center px-4 pb-12 pt-8 md:min-h-[32rem] md:pb-28 md:pt-16">
          <div className="max-w-xl">
            <h1 className="text-5xl leading-none md:text-7xl">We clean.<br />You relax.</h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">House and office cleaning, laundry, baby sitting, errands and house hunting. You choose who does the job.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={profile ? homeFor(profile) : '/signup'} className="btn-gold">Book a service</Link>
              <a href={wa} className="btn border border-white/50 text-white hover:bg-white/10">WhatsApp us</a>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO — photos with plain captions */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-6 pt-8 md:-mt-16 md:pt-0">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { n: 'House hunting', t: 'Tell us your area and budget.', img: 'hero-househunt.jpg', pos: 'object-top' },
            { n: 'Cleaning', t: 'Homes, offices, carpets, couches.', img: 'hero-cleaning.jpg', pos: 'object-[30%_85%]' },
            { n: 'Laundry', t: 'Free pickup and delivery.', img: 'hero-gloves.jpg', pos: 'object-center' },
            { n: 'Errands', t: 'Shopping and deliveries.', img: 'hero-errands.jpg', pos: 'object-top' },
          ].map((c, i) => (
            <a key={c.n} href="#services" className={`block bg-cream ${i % 2 ? 'md:mt-8' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/${c.img}`} alt={c.n} className={`aspect-[4/5] w-full rounded-md border-2 border-cream object-cover shadow-md ${c.pos}`} loading="lazy" />
              <p className="mt-2 font-display text-xl text-forest">{c.n}</p>
              <p className="text-sm text-forest-500">{c.t}</p>
            </a>
          ))}
        </div>
      </section>

      {/* PRICES — read like the price list on the flyer */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl text-forest md:text-4xl">Prices</h2>
        <p className="mt-1 text-forest-500">All prices are in Kenya shillings.</p>
        <div className="mt-8 grid gap-x-14 gap-y-9 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.c}>
              <h3 className="border-b-2 border-gold pb-1 text-2xl text-forest">{categoryMeta[g.c]?.label}</h3>
              <ul className="mt-2">
                {g.items.map((s) => (
                  <li key={s.id} className="flex items-baseline gap-2 py-1.5">
                    <span className="font-semibold">{s.name}</span>
                    <span className="min-w-4 flex-1 border-b border-dotted border-forest/30" />
                    <span className="whitespace-nowrap text-right">{s.price_note ? `${s.price_note} ` : ''}<b>{ksh(s.base_price)}</b>{unitLabel[s.price_unit] ? <span className="text-sm text-forest-500"> {unitLabel[s.price_unit]}</span> : null}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 border-l-4 border-gold bg-forest-50 px-4 py-3 font-semibold text-forest">Laundry and carpet cleaning: pickup and delivery are free.</p>
      </section>

      {/* HOW BOOKING WORKS */}
      <section id="how" className="bg-forest-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-3xl text-forest md:text-4xl">How booking works</h2>
            <p className="mt-3 max-w-sm text-forest-600">You see who is available and how they are rated before you decide. We ask for a small deposit first so that providers know the booking is serious.</p>
          </div>
          <ol className="space-y-5">
            {[
              ['Sign up', 'Create a customer account and confirm your email.'],
              ['Describe the job', 'Choose the service, say what needs doing and when.'],
              ['Pick your provider', 'Browse our verified employees with their ratings and choose one.'],
              ['Pay the deposit', 'KSh 100 for services under KSh 1,000. For KSh 1,000 and above it is 10% of the price.'],
              ['Chat and agree details', 'Chat opens once the deposit is paid. You pay the balance when the job is done and get a receipt.'],
            ].map(([t, p], i) => (
              <li key={t} className="flex gap-4">
                <span className="w-7 shrink-0 font-display text-3xl leading-none text-gold-600">{i + 1}</span>
                <div><p className="font-semibold text-forest">{t}</p><p className="text-forest-600">{p}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* OUR WORK */}
      <section id="work" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-3xl text-forest md:text-4xl">Our work</h2>
        <p className="mb-6 mt-1 text-forest-500">Jobs we have done for our customers.</p>
        {work.length === 0 ? (
          <p className="border border-dashed border-forest/30 p-8 text-forest-500">Photos of our work will be added here soon.</p>
        ) : (
          <>
            {cats.length > 1 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {['all', ...cats].map((c) => (
                  <button key={c} onClick={() => setFilter(c)} className={`rounded-md border px-3 py-1 text-sm font-semibold ${filter === c ? 'border-forest bg-forest text-white' : 'border-forest/25 hover:bg-forest-50'}`}>
                    {c === 'all' ? 'All' : categoryMeta[c]?.label || c}
                  </button>
                ))}
              </div>
            )}
            <div className="columns-2 gap-3 space-y-3 md:columns-3">
              {shown.map((w) => (
                <figure key={w.id} className="break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicUrl('portfolio', w.image_path)} alt={w.title} className="w-full rounded-md object-cover" loading="lazy" />
                  <figcaption className="mt-1 text-sm"><b>{w.title}</b>{w.description ? <span className="text-forest-500"> – {w.description}</span> : null}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </section>

      {/* SIGN UP PATHS */}
      <section className="bg-forest py-12 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h3 className="text-3xl">Need something cleaned, washed or found?</h3>
            <p className="mt-2 max-w-md text-white/80">Make a free customer account and book in a few minutes.</p>
            <Link href="/signup" className="btn-gold mt-4">Sign up as a customer</Link>
          </div>
          <div>
            <h3 className="text-3xl">Want to work with us?</h3>
            <p className="mt-2 max-w-md text-white/80">Send your details and a photo of your ID. We check every employee before they are approved.</p>
            <Link href="/signup/employee" className="btn mt-4 border border-white/50 text-white hover:bg-white/10">Apply as an employee</Link>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <footer id="contact" className="bg-forest-900 py-10 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
          <div><Logo light /><p className="mt-3 text-white/70">We clean, You relax.</p></div>
          <div className="space-y-2">
            <p className="font-display text-xl text-gold">Call or WhatsApp</p>
            <a href={tel} className="flex items-center gap-2 text-2xl font-bold"><Phone className="h-5 w-5 text-gold" />{PHONE}</a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 text-white/80"><Mail className="h-4 w-4 text-gold" />{EMAIL}</a>
          </div>
          <div>
            <p className="font-display text-xl text-gold">Social media</p>
            <p className="mt-2 flex items-center gap-4 text-white/80"><Facebook className="h-5 w-5" /><Music2 className="h-5 w-5" /><Instagram className="h-5 w-5" /> @jhomeandofficecare</p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-white/50">© {new Date().getFullYear()} J Home &amp; Office Care</p>
      </footer>
    </div>
  );
}
