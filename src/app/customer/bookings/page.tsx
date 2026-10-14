'use client';
import { BookingList } from '@/components/BookingList';
import { PageTitle } from '@/components/ui';
export default function Page() {
  return <><PageTitle title="My bookings" sub="Track requests, pay deposits and chat with your providers." /><BookingList role="customer" base="/customer/bookings" /></>;
}
