import { authenticateApiToken } from '@/lib/api-token-auth';
import { forwardToInternalApi } from '@/lib/internal-api';

type IntegrationCollectPayload =
  | {
      type: 'url';
      url: string;
      tags?: string[];
    }
  | {
      type: 'text';
      title: string;
      contentText: string;
      tags?: string[];
    }
  | {
      type: 'quick-add';
      shareText: string;
      tags?: string[];
      note?: string;
    };

function buildJsonRequest(request: Request) {
  return new Request(request.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
}

export async function POST(request: Request) {
  const rawToken =
    request.headers.get('x-api-token') ??
    request.headers.get('x-extension-token');
  const user = await authenticateApiToken(rawToken);

  if (!user) {
    return Response.json({ message: 'Invalid API token' }, { status: 401 });
  }

  const payload = (await request.json()) as IntegrationCollectPayload;
  const upstreamRequest = buildJsonRequest(request);

  if (payload.type === 'url') {
    return forwardToInternalApi(
      upstreamRequest,
      'contents',
      {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      },
      JSON.stringify({
        url: payload.url,
        tags: payload.tags,
      }),
    );
  }

  if (payload.type === 'text') {
    return forwardToInternalApi(
      upstreamRequest,
      'contents/text',
      {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      },
      JSON.stringify({
        title: payload.title,
        contentText: payload.contentText,
        tags: payload.tags,
      }),
    );
  }

  if (payload.type === 'quick-add') {
    return forwardToInternalApi(
      upstreamRequest,
      'contents/quick-add',
      {
        id: user.id,
        email: user.email,
        role: user.role,
        subscription: user.subscription,
      },
      JSON.stringify({
        shareText: payload.shareText,
        tags: payload.tags,
        note: payload.note,
      }),
    );
  }

  return Response.json({ message: 'Unsupported collect payload' }, { status: 400 });
}
