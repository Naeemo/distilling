import { requireSession } from '@/lib/session';
import { DashboardShell } from './dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = session.user as {
    name?: string | null;
    email: string;
    role?: string | null;
    subscription?: string | null;
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
