import { AppShell } from '@/components/app-shell';
import { requireAppUser } from '@/lib/app-user';

export default async function FeedsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAppUser();
  return <AppShell user={user}>{children}</AppShell>;
}
