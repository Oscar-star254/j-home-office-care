'use client';
import { usePathname } from 'next/navigation';
import { Guard, DashboardShell } from '@/components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // onboarding + pending screens have their own full-page layout
  if (path.startsWith('/employee/onboarding') || path.startsWith('/employee/pending')) return <>{children}</>;
  return <Guard role="employee"><DashboardShell role="employee">{children}</DashboardShell></Guard>;
}
