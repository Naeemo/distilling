import { authenticateApiToken } from '@/lib/api-token-auth';
import { forwardToInternalApi } from '@/lib/internal-api';

type ExtensionPayload = {
  url: string;
  title: string;
  contentText: string;
  author?: string;
  coverImage?: string | null;
  publishTime?: string | null;
  tags?: string[];
};

export async function POST(request: Request) {
  const rawToken =
    request.headers.get('x-extension-token') ??
    request.headers.get('x-api-token');
  const user = await authenticateApiToken(rawToken);

  if (!user) {
    return Response.json({ message: 'Invalid API token' }, { status: 401 });
  }

  const payload = (await request.json()) as ExtensionPayload;
  const upstreamRequest = new Request(request.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });

  return forwardToInternalApi(
    upstreamRequest,
    'contents/import',
    {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription,
    },
    JSON.stringify({
      url: payload.url,
      title: payload.title,
      contentText: payload.contentText,
      author: payload.author,
      coverImage: payload.coverImage,
      publishTime: payload.publishTime,
      tags: payload.tags,
    }),
  );
}
