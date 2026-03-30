import { requireSession } from '@/lib/session';

export default async function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
