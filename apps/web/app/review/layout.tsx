import { requireSession } from '@/lib/session';

export default async function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
