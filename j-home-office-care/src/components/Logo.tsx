export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path d="M8 30 32 8l24 22" stroke="#0f3d1e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 28v24h36V28" stroke="#0f3d1e" strokeWidth="5" strokeLinejoin="round" />
      <text x="32" y="46" textAnchor="middle" fontSize="28" fontWeight="800" fill="#d4a017" fontFamily="Georgia, serif">J</text>
      <path d="M6 56c10 6 22 6 34 2s14-4 18-8" stroke="#d4a017" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false, size = 44 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="leading-none">
        <span className={`block font-display text-xl uppercase ${light ? 'text-white' : 'text-forest'}`}>J Home &amp;</span>
        <span className={`block font-display text-xl uppercase ${light ? 'text-white' : 'text-forest'}`}>Office Care</span>
      </span>
    </span>
  );
}
