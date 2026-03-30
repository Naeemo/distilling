import { requireSession } from '@/lib/session';

export default async function KnowledgeGraphLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return children;
}
