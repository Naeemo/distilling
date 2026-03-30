import { prisma } from '@/lib/prisma';
import { extractExtensionTokenPrefix, hashExtensionToken } from '@/lib/extension-token';

export async function authenticateApiToken(rawToken: string | null) {
  if (!rawToken) {
    return null;
  }

  const tokenPrefix = extractExtensionTokenPrefix(rawToken);
  const user = await prisma.user.findFirst({
    where: { apiTokenPrefix: tokenPrefix },
    select: {
      id: true,
      email: true,
      role: true,
      subscription: true,
      apiTokenHash: true,
    },
  });

  if (!user || !user.apiTokenHash) {
    return null;
  }

  if (hashExtensionToken(rawToken) !== user.apiTokenHash) {
    return null;
  }

  return user;
}
