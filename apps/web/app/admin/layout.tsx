import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const user = session.user as { role?: string | null };

  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return children;
}
