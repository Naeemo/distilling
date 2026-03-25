// 全局状态管理 - 内容

import { create } from 'zustand';
import type { Content, Tag } from '@/types';

interface ContentState {
  contents: Content[];
  selectedContent: Content | null;
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filterStatus: string | null;
  filterTag: string | null;
  searchQuery: string;
  
  // Pagination
  page: number;
  total: number;
  limit: number;
  
  // Actions
  setContents: (contents: Content[], total?: number) => void;
  setSelectedContent: (content: Content | null) => void;
  setTags: (tags: Tag[]) => void;
  addContent: (content: Content) => void;
  updateContent: (id: string, updates: Partial<Content>) => void;
  removeContent: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilterStatus: (status: string | null) => void;
  setFilterTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
}

export const useContentStore = create<ContentState>()((set) => ({
  contents: [],
  selectedContent: null,
  tags: [],
  isLoading: false,
  error: null,
  filterStatus: null,
  filterTag: null,
  searchQuery: '',
  page: 1,
  total: 0,
  limit: 20,
  
  setContents: (contents, total) => set({ contents, total: total ?? contents.length }),
  setSelectedContent: (content) => set({ selectedContent: content }),
  setTags: (tags) => set({ tags }),
  addContent: (content) => set((state) => ({
    contents: [content, ...state.contents],
  })),
  updateContent: (id, updates) => set((state) => ({
    contents: state.contents.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    ),
    selectedContent:
      state.selectedContent?.id === id
        ? { ...state.selectedContent, ...updates }
        : state.selectedContent,
  })),
  removeContent: (id) => set((state) => ({
    contents: state.contents.filter((c) => c.id !== id),
  })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setFilterStatus: (status) => set({ filterStatus: status, page: 1 }),
  setFilterTag: (tag) => set({ filterTag: tag, page: 1 }),
  setSearchQuery: (query) => set({ searchQuery: query, page: 1 }),
  setPage: (page) => set({ page }),
}));
