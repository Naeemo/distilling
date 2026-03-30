import { getSession } from '@/lib/session';
import { HomePageClient } from './home-page-client';

export default async function HomePage() {
  const session = await getSession();
  return <HomePageClient isAuthenticated={Boolean(session)} />;
}
