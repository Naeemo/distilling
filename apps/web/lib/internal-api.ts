const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:3001/api/v1';

type InternalUserContext = {
  id: string;
  email: string;
  role?: string | null;
  subscription?: string | null;
};

function buildUpstreamUrl(pathname: string, search: string) {
  const baseUrl = INTERNAL_API_BASE_URL.endsWith('/')
    ? INTERNAL_API_BASE_URL
    : `${INTERNAL_API_BASE_URL}/`;
  const normalizedPath = pathname.replace(/^\/+/, '');
  return new URL(`${normalizedPath}${search}`, baseUrl);
}

export async function forwardToInternalApi(
  request: Request,
  pathname: string,
  user: InternalUserContext,
  bodyOverride?: string,
) {
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!internalToken) {
    throw new Error('INTERNAL_SERVICE_TOKEN is required');
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = buildUpstreamUrl(pathname, requestUrl.search);
  const upstreamHeaders = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (contentType) {
    upstreamHeaders.set('content-type', contentType);
  }

  if (accept) {
    upstreamHeaders.set('accept', accept);
  }

  upstreamHeaders.set('x-internal-service-token', internalToken);
  upstreamHeaders.set('x-user-id', user.id);
  upstreamHeaders.set('x-user-email', user.email);
  upstreamHeaders.set('x-user-role', user.role ?? 'USER');
  upstreamHeaders.set('x-user-subscription', user.subscription ?? 'FREE');

  const body =
    bodyOverride ??
    (request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text());

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    body,
    redirect: 'manual',
    cache: 'no-store',
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.delete('content-length');

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
