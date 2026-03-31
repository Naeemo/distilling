import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

async function getAuth() {
  const { auth } = await import('@/lib/auth');
  return auth;
}

export async function getSession() {
  try {
    const auth = await getAuth();
    return auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error('Failed to load session from Better Auth:', error);
    return null;
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
