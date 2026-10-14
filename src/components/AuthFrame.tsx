import Link from 'next/link';
import { ReactNode } from 'react';
import { Logo } from './Logo';

export function AuthFrame({ title, sub, children, wide = false }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[28px] border-gold/30" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border-[22px] border-gold/20" />
        <Link href="/"><Logo light size={52} /></Link>
        <div className="relative">
          <p className="font-script text-5xl text-gold-300">We clean, You relax.</p>
          <p className="mt-4 max-w-md text-lg text-white/80">Cleaning, laundry, baby sitting, house hunting and errands — handled by trusted, rated people.</p>
        </div>
        <p className="relative text-sm text-white/60">0707 089 523 · jhomeandofficecare@gmail.com</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
        <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <Link href="/" className="mb-6 block lg:hidden"><Logo size={44} /></Link>
          <h1 className="text-4xl text-forest">{title}</h1>
          {sub && <p className="mb-6 mt-1 text-forest-500">{sub}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
