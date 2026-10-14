'use client';
import { BookingList } from '@/components/BookingList';
import { PageTitle } from '@/components/ui';
export default function Page() { return <><PageTitle title="My jobs" sub="Customers who chose you." /><BookingList role="employee" base="/employee/jobs" /></>; }
