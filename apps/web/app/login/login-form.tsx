'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth-shell';
import { authClient } from '@/lib/auth-client';
import { syncExtensionTokenFromSession } from '@/lib/extension';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const submitLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || '登录失败，请检查邮箱和密码');
        return;
      }

      await syncExtensionTokenFromSession();
      router.push('/feeds');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitLogin();
  };

  return (
    <AuthShell
      eyebrow="Sign In"
      title="继续你的信息提纯工作流"
      description="登录后从信息中心继续看结论，从 Records 继续补充输入。把判断力留给真正值得展开的内容。"
    >
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">欢迎回来</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            登录后继续查看高价值结论流与历史记录。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="邮箱"
            name="email"
            type="email"
            aria-label="登录邮箱"
            data-testid="login-email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />

          <Input
            label="密码"
            name="password"
            type="password"
            aria-label="登录密码"
            data-testid="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入登录密码"
            required
          />

          {error && (
            <div
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/12 dark:text-red-300"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            data-testid="login-submit"
          >
            登录
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">还没有账户？</span>{' '}
          <Link
            href="/register"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            立即注册
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
