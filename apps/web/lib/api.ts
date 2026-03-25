// API 客户端

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

async function fetchWithAuth(url: string, config: RequestConfig = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // 构建 URL
  let fullUrl = `${API_BASE_URL}${url}`;
  if (config.params) {
    const params = new URLSearchParams(config.params);
    fullUrl += `?${params.toString()}`;
  }
  
  const response = await fetch(fullUrl, {
    ...config,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  
  return response.json();
}

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
      const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        },
        body: JSON.stringify({ contentId, type }),
      });
      
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
