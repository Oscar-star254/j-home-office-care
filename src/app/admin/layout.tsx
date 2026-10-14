'use client';
import { Guard, DashboardShell } from '@/components/Shell';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Guard role="admin"><DashboardShell role="admin">{children}</DashboardShell></Guard>;
}
