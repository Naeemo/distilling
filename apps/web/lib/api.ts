// Same-origin BFF client. Authentication is handled by Better Auth session cookies.

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

async function fetchWithAuth(url: string, config: RequestConfig = {}) {
  let fullUrl = `/api/v1${url}`;

  if (config.params) {
    const filteredParams = Object.fromEntries(
      Object.entries(config.params).filter(([, value]) => value != null && value !== ''),
    );
    const params = new URLSearchParams(filteredParams);
    const query = params.toString();
    if (query) {
      fullUrl += `?${query}`;
    }
  }

  const headers = new Headers(config.headers);
  if (config.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(fullUrl, {
    ...config,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' })) as { message?: string };
    const requestError = new Error(error.message || 'Request failed') as Error & {
      status?: number;
    };
    requestError.status = response.status;
    throw requestError;
  }

  return response.json();
}

async function authenticatedFetch(
  input: string,
  init: RequestInit = {},
) {
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
  });
}

export const apiClient = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, data?: unknown) =>
    fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data) }),
  patch: (url: string, data?: unknown) =>
    fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};

export const api = {
  contents: {
    list: (params?: { status?: string; tagId?: string; search?: string; page?: string; limit?: string }) =>
      fetchWithAuth('/contents', { params }),
    get: (id: string) => fetchWithAuth(`/contents/${id}`),
    create: (url: string, tags?: string[]) =>
      fetchWithAuth('/contents', {
        method: 'POST',
        body: JSON.stringify({ url, tags }),
      }),
    createText: (title: string, contentText: string, tags?: string[]) =>
      fetchWithAuth('/contents/text', {
        method: 'POST',
        body: JSON.stringify({ title, contentText, tags }),
      }),
    updateStatus: (id: string, status: string) =>
      fetchWithAuth(`/contents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateProgress: (
      id: string,
      data: {
        progress: number;
        position?: { scrollY: number; paragraphIndex?: number };
        readingTime?: number;
      },
    ) =>
      fetchWithAuth(`/contents/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      fetchWithAuth(`/contents/${id}`, { method: 'DELETE' }),
    submissions: (params?: { limit?: string }) =>
      fetchWithAuth('/contents/submissions', { params }),
  },

  tags: {
    list: () => fetchWithAuth('/tags'),
    create: (name: string, color?: string) =>
      fetchWithAuth('/tags', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
      }),
    addToContent: (contentId: string, tagId: string) =>
      fetchWithAuth(`/contents/${contentId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tagId }),
      }),
    removeFromContent: (contentId: string, tagId: string) =>
      fetchWithAuth(`/contents/${contentId}/tags/${tagId}`, { method: 'DELETE' }),
  },

  highlights: {
    create: (data: {
      contentId: string;
      highlightText: string;
      position: { startOffset: number; endOffset: number; paragraphIndex?: number };
      color?: string;
      note?: string;
    }) =>
      fetchWithAuth('/highlights', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { note?: string; color?: string }) =>
      fetchWithAuth(`/highlights/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchWithAuth(`/highlights/${id}`, { method: 'DELETE' }),
  },

  ai: {
    summarize: async (contentId: string, type: string, onChunk: (chunk: string) => void) => {
      const response = await authenticatedFetch('/api/v1/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentId, type }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: 'Request failed' })) as { message?: string };
        throw new Error(error.message || 'Request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data) as { chunk?: string };
            if (parsed.chunk) onChunk(parsed.chunk);
          } catch {
            // Ignore malformed SSE chunks.
          }
        }
      }
    },
    getSummaries: (contentId: string) =>
      fetchWithAuth(`/ai/contents/${contentId}/summaries`),
  },

  reviews: {
    today: () => fetchWithAuth('/reviews/today'),
    upcoming: (days?: number) =>
      fetchWithAuth('/reviews/upcoming', {
        params: days ? { days: String(days) } : undefined,
      }),
    stats: () => fetchWithAuth('/reviews/stats'),
    complete: (id: string, rating: string) =>
      fetchWithAuth(`/reviews/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      }),
  },

  workspace: {
    listArticles: () => fetchWithAuth('/workspace/articles'),
    getArticle: (id: string) => fetchWithAuth(`/workspace/articles/${id}`),
    createArticle: (initialIdea: string) =>
      fetchWithAuth('/workspace/articles', {
        method: 'POST',
        body: JSON.stringify({ initialIdea }),
      }),
    updateArticle: (id: string, data: { title?: string; body?: string }) =>
      fetchWithAuth(`/workspace/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    retryArticle: (id: string) =>
      fetchWithAuth(`/workspace/articles/${id}/retry`, {
        method: 'POST',
      }),
  },
};
