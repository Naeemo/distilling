'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';
import {
  clearExtensionToken,
  revokeExtensionTokenFromSession,
  syncExtensionTokenFromSession,
} from '@/lib/extension';

type AppShellUser = {
  name?: string | null;
  email: string;
  role?: string | null;
  subscription?: string | null;
};

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AppShellUser;
}) {
  const pathname = usePathname();

  useEffect(() => {
    void syncExtensionTokenFromSession();
  }, []);

  const handleLogout = async () => {
    await revokeExtensionTokenFromSession();
    await authClient.signOut();
    clearExtensionToken();
    window.location.assign('/login');
  };

  const navItems = [
    {
      href: '/feeds',
      label: '信息中心',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      href: '/workspace',
      label: '工作区',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      href: '/review',
      label: '今日复习',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/feeds/activity',
      label: '添加记录',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/feeds/integrations',
      label: 'Integrations',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h6M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 3V8a2 2 0 012-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-transparent md:grid md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-gray-200/70 bg-white/80 backdrop-blur md:min-h-screen md:border-b-0 md:border-r md:border-gray-200/70 dark:border-gray-800 dark:bg-gray-950/85">
        <div className="flex h-full flex-col px-4 py-5 md:px-5">
          <Link href="/" className="flex items-center gap-3 px-3 py-2">
            <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <div>
              <span className="block text-lg font-semibold tracking-tight text-gray-950 dark:text-white">知萃</span>
              <span className="block text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Info Digest</span>
            </div>
          </Link>

          <div className="mt-6 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/70">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Workspace</p>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Feeds 承接系统整理后的信息流，工作区承接你主动写作和消化的过程。
            </p>
          </div>

          <nav className="mt-6 flex-1 space-y-1">
            <p className="px-3 pb-2 text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">导航</p>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gray-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.16)] dark:bg-white dark:text-gray-950'
                      : 'text-gray-600 hover:bg-white hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white',
                  )}
                >
                  <span className={cn('transition-transform duration-200', !isActive && 'group-hover:translate-x-0.5')}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}

            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="mt-3 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-amber-700 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                系统配置
              </Link>
            )}
          </nav>

          <div className="mt-6 rounded-2xl border border-gray-200/80 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/70">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">主题</span>
              <ThemeToggle />
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {user.name || user.email}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {user.subscription === 'FREE' ? '免费版' : '专业版'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              data-testid="logout-button"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a2 2 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 overflow-auto">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
