'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell } from '@/components/auth-shell';
import { authClient } from '@/lib/auth-client';
import { syncExtensionTokenFromSession } from '@/lib/extension';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const submitRegistration = async () => {
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符');
      setIsLoading(false);
      return;
    }

    try {
      const result = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split('@')[0] || 'InfoDigest User',
      });

      if (result.error) {
        setError(result.error.message || '注册失败，请稍后重试');
        return;
      }

      await syncExtensionTokenFromSession();
      router.push('/feeds');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '注册失败，请稍后重试';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitRegistration();
  };

  return (
    <AuthShell
      eyebrow="Register"
      title="创建你的信息提纯工作台"
      description="把链接、微信文章与零散笔记统一收口，先看到高价值结论，再决定哪些内容值得继续深入。"
    >
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">创建账户</h2>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            注册后即可开始构建自己的结论流与记录时间轴。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="昵称"
            name="name"
            type="text"
            aria-label="注册昵称"
            data-testid="register-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="怎么称呼你"
          />

          <Input
            label="邮箱"
            name="email"
            type="email"
            aria-label="注册邮箱"
            data-testid="register-email"
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
            aria-label="注册密码"
            data-testid="register-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 个字符"
            required
          />

          <Input
            label="确认密码"
            name="confirmPassword"
            type="password"
            aria-label="确认注册密码"
            data-testid="register-confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="再次输入密码"
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
            data-testid="register-submit"
          >
            注册
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">已有账户？</span>{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            立即登录
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
