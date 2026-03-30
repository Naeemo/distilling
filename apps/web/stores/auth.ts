// 全局状态管理 - 认证

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

type ChromeRuntime = {
  sendMessage?: (
    extensionId: string,
    message: unknown,
    callback?: (response?: { success?: boolean; message?: string }) => void
  ) => void;
  lastError?: unknown;
};

function shouldLogExtensionSync() {
  return process.env.NEXT_PUBLIC_DEBUG_EXTENSION_SYNC === 'true';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * 同步 Token 到浏览器扩展
 * 方案 A：网页 → 扩展通信
 */
function syncTokenToExtension(token: string | null) {
  if (typeof window === 'undefined') return;

  const extensionRuntime = (
    globalThis as typeof globalThis & { chrome?: { runtime?: ChromeRuntime } }
  ).chrome?.runtime;
  if (!extensionRuntime?.sendMessage) return;
  
  // Chrome 扩展 ID（开发环境固定值，生产环境需要配置）
  const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || 
    'abcdefghijklmnopabcdefghijklmnop'; // 占位符，需要替换为实际 ID
  
  try {
    if (token) {
      // 发送 token 到扩展
      extensionRuntime.sendMessage(EXTENSION_ID, {
        type: 'SET_TOKEN',
        token: token
      }, (response?: { success?: boolean; message?: string }) => {
        if (extensionRuntime.lastError) {
          if (shouldLogExtensionSync()) {
            console.debug('[InfoDigest] 扩展未安装或通信失败');
          }
          return;
        }
        if (response?.success && shouldLogExtensionSync()) {
          console.debug('[InfoDigest] Token 已同步到扩展');
        }
      });
    } else {
      // 清除 token
      extensionRuntime.sendMessage(EXTENSION_ID, {
        type: 'CLEAR_TOKEN'
      }, () => {
        // 忽略错误
      });
    }
  } catch (error) {
    if (shouldLogExtensionSync()) {
      console.debug('[InfoDigest] 扩展通信失败（可能未安装）');
    }
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      
      setAuth: (user, accessToken, refreshToken) => {
        // 同步 token 到浏览器扩展
        syncTokenToExtension(accessToken);
        
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },
      
      clearAuth: () => {
        // 清除扩展中的 token
        syncTokenToExtension(null);
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
      
      setUser: (user) => set({ user }),
      
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
