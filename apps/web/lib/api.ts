// API 客户端

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api/v1';
  }

  return '/api/v1';
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

function getStoredAuthState() {
  if (typeof window === 'undefined') {
    return null;
  }

  const persistedAuth = localStorage.getItem('auth-storage');
  if (!persistedAuth) {
    return { raw: null, state: null };
  }

  try {
    const parsed = JSON.parse(persistedAuth) as {
      state?: {
        accessToken?: string | null;
        refreshToken?: string | null;
        isAuthenticated?: boolean;
      };
      accessToken?: string | null;
      refreshToken?: string | null;
      isAuthenticated?: boolean;
    };

    return { raw: persistedAuth, state: parsed };
  } catch {
    return { raw: persistedAuth, state: null };
  }
}

function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('accessToken');
  if (directToken) {
    return directToken;
  }

  const persisted = getStoredAuthState();
  return persisted?.state?.state?.accessToken ??
    persisted?.state?.accessToken ??
    null;
}

function getStoredRefreshToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('refreshToken');
  if (directToken) {
    return directToken;
  }

  const persisted = getStoredAuthState();
  return persisted?.state?.state?.refreshToken ??
    persisted?.state?.refreshToken ??
    null;
}

function persistAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  const persisted = getStoredAuthState();
  if (!persisted?.state) {
    return;
  }

  const nextState = 'state' in persisted.state && persisted.state.state
    ? {
        ...persisted.state,
        state: {
          ...persisted.state.state,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        },
      }
    : {
        ...persisted.state,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      };

  localStorage.setItem('auth-storage', JSON.stringify(nextState));
}

function clearStoredAuthTokens() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');

  const persisted = getStoredAuthState();
  if (!persisted?.state) {
    return;
  }

  const nextState = 'state' in persisted.state && persisted.state.state
    ? {
        ...persisted.state,
        state: {
          ...persisted.state.state,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        },
      }
    : {
        ...persisted.state,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      };

  localStorage.setItem('auth-storage', JSON.stringify(nextState));
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const apiBaseUrl = getApiBaseUrl();
  refreshPromise = (async () => {
    const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredAuthTokens();
      return null;
    }

    const tokens = await response.json() as {
      accessToken?: string;
      refreshToken?: string;
    };

    if (!tokens.accessToken || !tokens.refreshToken) {
      clearStoredAuthTokens();
      return null;
    }

    persistAuthTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function authenticatedFetch(
  input: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
) {
  const token = getStoredAccessToken();
  const initHeaders = init.headers as Record<string, string> | undefined;
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(initHeaders || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return authenticatedFetch(input, init, false);
    }
  }

  return response;
}

async function fetchWithAuth(url: string, config: RequestConfig = {}) {
  const apiBaseUrl = getApiBaseUrl();

  // 构建 URL
  let fullUrl = `${apiBaseUrl}${url}`;
  if (config.params) {
    const filteredParams = Object.fromEntries(
      Object.entries(config.params).filter(([, value]) => value != null && value !== '')
    );
    const params = new URLSearchParams(filteredParams);
    fullUrl += `?${params.toString()}`;
  }

  const response = await authenticatedFetch(fullUrl, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const requestError = new Error(error.message || 'Request failed') as Error & { status?: number };
    requestError.status = response.status;
    throw requestError;
  }
  
  return response.json();
}

// 导出兼容 axios 风格的 apiClient
export const apiClient = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, data?: any) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(data) }),
  patch: (url: string, data?: any) => fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};

// API 方法
export const api = {
  // 认证
  auth: {
    login: (email: string, password: string) =>
      fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name?: string) =>
      fetchWithAuth('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    refresh: (refreshToken: string) =>
      fetchWithAuth('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    me: () => fetchWithAuth('/auth/me'),
  },
  
  // 内容
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
    updateProgress: (id: string, data: { progress: number; position?: { scrollY: number; paragraphIndex?: number }; readingTime?: number }) =>
      fetchWithAuth(`/contents/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    archive: (id: string) =>
      fetchWithAuth(`/contents/${id}`, { method: 'DELETE' }),
  },
  
  // 标签
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
  
  // 高亮
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
  
  // AI
  ai: {
    summarize: async (contentId: string, type: string, onChunk: (chunk: string) => void) => {
      const apiBaseUrl = getApiBaseUrl();
      const response = await authenticatedFetch(`${apiBaseUrl}/ai/summarize`, {
        method: 'POST',
        body: JSON.stringify({ contentId, type }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) onChunk(parsed.chunk);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    },
    getSummaries: (contentId: string) =>
      fetchWithAuth(`/ai/contents/${contentId}/summaries`),
  },
  
  // 复习
  reviews: {
    today: () => fetchWithAuth('/reviews/today'),
    upcoming: (days?: number) =>
      fetchWithAuth('/reviews/upcoming', { params: days ? { days: String(days) } : undefined }),
    stats: () => fetchWithAuth('/reviews/stats'),
    complete: (id: string, rating: string) =>
      fetchWithAuth(`/reviews/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ rating }),
      }),
  },
};
