export const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString('en-KE')}`;

export const unitLabel: Record<string, string> = {
  flat: '', per_seater: 'per seater', per_kg: 'per kg', per_basket: 'per basket', per_child_8hrs: 'per child / 8 hrs',
};
export const quantityLabel: Record<string, string> = {
  per_seater: 'Number of seaters', per_kg: 'Weight (kg)', per_basket: 'Number of baskets', per_child_8hrs: 'Number of children',
};

// Mirrors the database function compute_deposit(): >= 1000 -> 10%, otherwise KSh 100
export function computeDeposit(price: number) {
  return price >= 1000 ? Math.ceil(price * 0.1) : 100;
}

// Kenyan mobile numbers: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
export function normalizeKePhone(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, '');
  if (/^(?:\+?254)(7|1)\d{8}$/.test(d)) return '254' + d.replace(/^\+?254/, '');
  if (/^0(7|1)\d{8}$/.test(d)) return '254' + d.slice(1);
  return null;
}

export const statusMeta: Record<string, { label: string; cls: string }> = {
  awaiting_deposit: { label: 'Awaiting deposit', cls: 'bg-gold-100 text-gold-700' },
  requested:        { label: 'Waiting for provider', cls: 'bg-blue-100 text-blue-700' },
  accepted:         { label: 'Accepted', cls: 'bg-forest-100 text-forest-700' },
  in_progress:      { label: 'In progress', cls: 'bg-purple-100 text-purple-700' },
  completed:        { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  declined:         { label: 'Declined', cls: 'bg-red-100 text-red-700' },
  cancelled:        { label: 'Cancelled', cls: 'bg-gray-200 text-gray-700' },
  refund_due:       { label: 'Refund due', cls: 'bg-orange-100 text-orange-700' },
};

export const categoryMeta: Record<string, { label: string; blurb: string }> = {
  house_hunting: { label: 'House Hunting', blurb: 'Your location. Your budget. We do the search.' },
  cleaning:      { label: 'Cleaning Services', blurb: 'We clean, You relax.' },
  laundry:       { label: 'Laundry & Mama Fua', blurb: 'Fresh, folded, delivered.' },
  care:          { label: 'Baby Sitting', blurb: 'Trusted care while you are away.' },
  errands:       { label: 'Errands', blurb: 'We run. You relax.' },
};

export const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
};
