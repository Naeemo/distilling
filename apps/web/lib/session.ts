import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';

async function getAuth() {
  const { auth } = await import('@/lib/auth');
  return auth;
}

export async function getSession() {
  noStore();

  try {
    const auth = await getAuth();
    return auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      error.message.includes('BETTER_AUTH_SECRET is required')
    ) {
      console.error('Better Auth secret is missing, fallback to guest session.');
      return null;
    }

    throw error;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }
}
