'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // 主题
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // 侧边栏折叠
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // 阅读器设置
  readerFontSize: number;
  setReaderFontSize: (size: number) => void;
  readerLineHeight: number;
  setReaderLineHeight: (height: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      readerFontSize: 16,
      setReaderFontSize: (size) => set({ readerFontSize: size }),
      readerLineHeight: 1.6,
      setReaderLineHeight: (height) => set({ readerLineHeight: height }),
    }),
    {
      name: 'ui-storage',
    }
  )
);
