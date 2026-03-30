import { auth } from '@/lib/auth';
import { createExtensionToken } from '@/lib/extension-token';
import { prisma } from '@/lib/prisma';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const;

async function getAuthenticatedUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return null;
  }

  return session.user;
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const token = createExtensionToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      apiTokenPrefix: token.prefix,
      apiTokenHash: token.hash,
    },
  });

  return Response.json(
    { token: token.token },
    { headers: NO_STORE_HEADERS },
  );
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      apiTokenPrefix: null,
      apiTokenHash: null,
    },
  });

  return Response.json(
    { success: true },
    { headers: NO_STORE_HEADERS },
  );
}
