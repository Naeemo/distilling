'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/ui';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // 防止 hydration 不匹配
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
