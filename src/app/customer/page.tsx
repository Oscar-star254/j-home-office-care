'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Search, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { ServiceIcon, Spinner, Stars } from '@/components/ui';
import { categoryMeta, ksh, unitLabel, statusMeta } from '@/lib/utils';
import type { Booking, Service } from '@/lib/types';

export default function CustomerHome() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[] | null>(null);
  const [active, setActive] = useState<Booking[]>([]);

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true).order('sort_order').then(({ data }) => setServices((data as Service[]) || []));
    supabase.from('bookings').select('*, services(name)').not('status', 'in', '(completed,cancelled,declined)').order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setActive((data as any) || []));
  }, []);

  if (!services) return <Spinner />;
  const cleaning = services.filter((s) => s.category === 'cleaning');
  const hh = services.find((s) => s.category === 'house_hunting');
  const others = services.filter((s) => !['cleaning', 'house_hunting'].includes(s.category));

  return (
    <div className="space-y-10">
      {/* PHOTO HERO — team photo background */}
      <section className="overflow-hidden rounded-3xl bg-forest text-white shadow-card md:relative md:min-h-[22rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-team.jpg" alt="The J Home & Office Care team with their van and equipment" className="h-52 w-full object-cover object-[50%_35%] md:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-team-wide.jpg" alt="" aria-hidden className="absolute inset-0 hidden h-full w-full object-cover object-[right_top] md:block" />
        <div className="relative p-6 md:flex md:min-h-[22rem] md:max-w-xl md:flex-col md:justify-center md:p-10">
          <p className="font-script text-3xl text-gold-300">We clean, You relax.</p>
          <h1 className="mt-1 text-4xl uppercase md:text-5xl">Hello, <span className="text-gold">{profile?.full_name?.split(' ')[0] || 'there'}</span> 👋</h1>
          <p className="mt-2 max-w-md text-white/80">What can we take off your hands today?</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/customer/book/house-hunting" className="btn-gold">House hunting</Link>
            <a href="#cleaning" className="btn border border-white/40 text-white hover:bg-white/10">Cleaning services</a>
          </div>
        </div>
      </section>

      {active.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl uppercase">Your active bookings</h2><Link href="/customer/bookings" className="text-sm font-semibold text-gold-600">View all</Link></div>
          <div className="grid gap-3 md:grid-cols-3">
            {active.map((b) => (
              <Link key={b.id} href={`/customer/bookings/${b.id}`} className="card p-4 transition hover:-translate-y-0.5">
                <div className="flex items-center justify-between"><b>{(b as any).services?.name}</b><span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span></div>
                <p className="mt-1 text-sm text-forest-500">Ref {b.reference}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* MAIN SERVICES — larger cards */}
      <section className="grid gap-5 lg:grid-cols-2">
        {(
          <div className="relative overflow-hidden rounded-3xl bg-forest text-white shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero-househunt.jpg" alt="" className="h-48 w-full object-cover object-center" />
            <div className="p-7 md:p-9">
            <span className="relative inline-flex rounded-2xl bg-gold p-3 text-forest-900"><Search className="h-8 w-8" /></span>
            <h2 className="relative mt-4 text-4xl uppercase md:text-5xl">House Hunting <span className="text-gold">Services</span></h2>
            <p className="relative mt-2 max-w-md text-white/80">We understand house hunting can be draining and time consuming. Give us your location and rent budget — we do the search.</p>
            <ul className="relative mt-4 flex flex-wrap gap-2 text-xs font-semibold">
              {['Studios', '1–3 Bedroom', 'Own compound', 'Maisonettes', 'Apartments', 'Mansionettes'].map((t) => <li key={t} className="rounded-full border border-gold/50 px-3 py-1">{t}</li>)}
            </ul>
            <Link href={`/customer/book/${hh?.slug ?? 'house-hunting'}`} className="btn-gold relative mt-6">Start my search <ArrowRight className="h-5 w-5" /></Link>
            </div>
          </div>
        )}
        <div id="cleaning" className="relative scroll-mt-20 overflow-hidden rounded-3xl border-2 border-gold bg-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-gloves.jpg" alt="" className="h-48 w-full object-cover object-center" />
          <div className="p-7 md:p-9">
          <span className="inline-flex rounded-2xl bg-forest p-3 text-gold"><Sparkles className="h-8 w-8" /></span>
          <h2 className="mt-4 text-4xl uppercase text-forest md:text-5xl">Cleaning <span className="text-gold">Services</span></h2>
          <p className="mt-2 text-forest-500">Homes, offices, couches, carpets and dishes — pick what you need.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {cleaning.map((s) => (
              <Link key={s.id} href={`/customer/book/${s.slug}`} className="flex items-center gap-3 rounded-xl border border-forest/15 px-3 py-2.5 transition hover:border-gold hover:bg-gold-50">
                <span className="rounded-full bg-forest p-2 text-gold"><ServiceIcon name={s.icon} className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{s.name}</b><span className="text-xs text-forest-500">{s.price_note} {ksh(s.base_price)} {unitLabel[s.price_unit]}</span></span>
              </Link>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* OTHER SERVICES */}
      <section>
        <h2 className="mb-3 text-2xl uppercase">More services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((s) => (
            <Link key={s.id} href={`/customer/book/${s.slug}`} className="card group p-5 transition hover:-translate-y-1">
              <span className="inline-flex rounded-xl bg-forest p-3 text-gold"><ServiceIcon name={s.icon} /></span>
              <h3 className="mt-3 text-xl uppercase leading-tight">{s.name}</h3>
              <p className="text-xs text-forest-500">{categoryMeta[s.category]?.blurb}</p>
              <p className="mt-3 font-display text-lg text-forest">{s.price_note} {ksh(s.base_price)} <span className="text-xs font-body text-forest-500">{unitLabel[s.price_unit]}</span></p>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-forest-50 p-5 text-sm text-forest-600">
        <ShieldCheck className="h-6 w-6 text-forest" />
        <p className="flex-1">Every provider is ID-verified. Pay a small deposit (10% for services from KSh 1,000, otherwise KSh 100) to unlock chat with your chosen provider.</p>
      </section>
    </div>
  );
}
