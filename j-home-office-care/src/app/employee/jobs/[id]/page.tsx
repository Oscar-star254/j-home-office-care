'use client';
import { Suspense, use } from 'react';
import { BookingDetail } from '@/components/BookingDetail';
import { Spinner } from '@/components/ui';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<Spinner />}><BookingDetail id={id} role="employee" backHref="/employee/jobs" /></Suspense>;
}
