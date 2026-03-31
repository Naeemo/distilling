import { requireSession } from '@/lib/session';

export type AppUser = {
  name?: string | null;
  email: string;
  role?: string | null;
  subscription?: string | null;
};

export async function requireAppUser(): Promise<AppUser> {
  const session = await requireSession();
  return session.user as AppUser;
}
