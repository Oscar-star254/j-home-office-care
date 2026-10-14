'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/ui';
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
      {/* greeting */}
      <section className="overflow-hidden rounded-lg bg-forest text-white">
        <div className="grid md:grid-cols-[1.3fr_0.7fr]">
          <div className="p-6 md:p-9">
            <h1 className="text-4xl md:text-5xl">Hello, {profile?.full_name?.split(' ')[0] || 'there'}</h1>
            <p className="mt-2 max-w-md text-white/80">What do you need done today? Pick a service below.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-cleaning.jpg" alt="" className="hidden h-44 w-full object-cover object-top md:block" />
        </div>
      </section>

      {active.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="text-2xl">Your bookings in progress</h2><Link href="/customer/bookings" className="text-sm font-semibold text-gold-700 underline">All bookings</Link></div>
          <div className="grid gap-3 md:grid-cols-3">
            {active.map((b) => (
              <Link key={b.id} href={`/customer/bookings/${b.id}`} className="card p-4 hover:border-gold">
                <div className="flex items-center justify-between gap-2"><b>{(b as any).services?.name}</b><span className={`badge ${statusMeta[b.status].cls}`}>{statusMeta[b.status].label}</span></div>
                <p className="mt-1 text-sm text-forest-500">Ref {b.reference}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* the two main services */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-forest text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-househunt.jpg" alt="" className="h-48 w-full object-cover object-center" />
          <div className="p-6 md:p-8">
            <h2 className="text-3xl md:text-4xl">House hunting</h2>
            <p className="mt-2 max-w-md text-white/80">House hunting takes time. Give us your location and rent budget and we do the searching for you.</p>
            <p className="mt-3 text-sm text-white/70">We look for studios, 1 to 3 bedrooms, own compound, maisonettes, apartments and mansionettes.</p>
            <Link href={`/customer/book/${hh?.slug ?? 'house-hunting'}`} className="btn-gold mt-5">Start my search</Link>
          </div>
        </div>
        <div id="cleaning" className="scroll-mt-20 overflow-hidden rounded-lg border-2 border-gold bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-gloves.jpg" alt="" className="h-48 w-full object-cover object-center" />
          <div className="p-6 md:p-8">
            <h2 className="text-3xl text-forest md:text-4xl">Cleaning services</h2>
            <p className="mt-2 text-forest-600">Homes, offices, couches, carpets and dishes.</p>
            <ul className="mt-3 divide-y divide-forest/10">
              {cleaning.map((s) => (
                <li key={s.id}>
                  <Link href={`/customer/book/${s.slug}`} className="flex items-baseline justify-between gap-3 py-2 hover:text-gold-700">
                    <span className="font-semibold">{s.name}</span>
                    <span className="whitespace-nowrap text-sm text-forest-500">{s.price_note} {ksh(s.base_price)} {unitLabel[s.price_unit]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* other services */}
      <section>
        <h2 className="mb-2 text-2xl">Other services</h2>
        <ul className="divide-y divide-forest/10 border-y border-forest/10">
          {others.map((s) => (
            <li key={s.id}>
              <Link href={`/customer/book/${s.slug}`} className="flex items-baseline justify-between gap-4 py-3 hover:bg-forest-50">
                <span><b className="block">{s.name}</b><span className="text-sm text-forest-500">{categoryMeta[s.category]?.blurb}</span></span>
                <span className="whitespace-nowrap font-semibold text-forest">{s.price_note} {ksh(s.base_price)} <span className="text-sm font-normal text-forest-500">{unitLabel[s.price_unit]}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-l-4 border-gold bg-forest-50 px-4 py-3 text-sm text-forest-700">To chat with your chosen provider you first pay a deposit: 10% of the price for services from KSh 1,000, otherwise KSh 100.</p>
    </div>
  );
}
