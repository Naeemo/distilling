import { auth } from '@/lib/auth';
import { forwardToInternalApi } from '@/lib/internal-api';

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { path } = await context.params;

  return forwardToInternalApi(request, path.join('/'), {
    id: session.user.id,
    email: session.user.email,
    role: (session.user as { role?: string }).role,
    subscription: (session.user as { subscription?: string }).subscription,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, context);
}
