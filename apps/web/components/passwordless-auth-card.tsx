'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Github, Mail } from 'lucide-react';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

type PasswordlessAuthCardProps = {
  mode: 'login' | 'register';
  availability: {
    google: boolean;
    github: boolean;
    magicLink: boolean;
  };
};

type PendingProvider = 'google' | 'github' | 'magic-link' | null;

const authCopy = {
  login: {
    eyebrow: 'Sign In',
    shellTitle: '继续你的信息提纯工作流',
    shellDescription:
      '登录后从信息中心继续看结论，从 Records 继续补充输入。把判断力留给真正值得展开的内容。',
    title: '欢迎回来',
    description: '用 Google、GitHub 或邮箱魔法链接继续进入你的工作台。',
    magicLinkButton: '发送登录链接',
    magicLinkSuccess: '登录链接已发送，请查收邮箱并在链接有效期内完成登录。',
    alternativePrompt: '第一次使用？',
    alternativeLinkLabel: '去创建账户',
    alternativeHref: '/register',
    errorCallbackURL: '/login',
  },
  register: {
    eyebrow: 'Register',
    shellTitle: '创建你的信息提纯工作台',
    shellDescription:
      '把链接、微信文章与零散笔记统一收口，先看到高价值结论，再决定哪些内容值得继续深入。',
    title: '创建账户',
    description: '不再设置密码，直接用 Google、GitHub 或邮箱魔法链接开始使用。',
    magicLinkButton: '发送注册链接',
    magicLinkSuccess: '注册链接已发送，请查收邮箱并点击完成创建。',
    alternativePrompt: '已经有账户？',
    alternativeLinkLabel: '直接登录',
    alternativeHref: '/login',
    errorCallbackURL: '/register',
  },
} as const;

function GoogleMark() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M21.6 12.23c0-.74-.06-1.28-.2-1.85H12v3.48h5.52c-.11.86-.7 2.16-2 3.03l-.02.12 2.84 2.16.2.02c1.86-1.68 2.94-4.15 2.94-6.96Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.9c2.7 0 4.96-.87 6.62-2.38l-3.16-2.3c-.84.58-1.97.98-3.46.98-2.64 0-4.88-1.68-5.68-4.02l-.12.01-2.95 2.25-.04.11C4.86 19.75 8.16 21.9 12 21.9Z"
        fill="#34A853"
      />
      <path
        d="M6.32 14.18A5.79 5.79 0 0 1 6 12c0-.75.12-1.47.3-2.18l-.01-.15-2.99-2.28-.1.05A9.72 9.72 0 0 0 2.4 12c0 1.56.38 3.03 1.04 4.36l2.88-2.18Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.8c1.88 0 3.14.8 3.86 1.47l2.82-2.7C16.95 3 14.7 2.1 12 2.1c-3.84 0-7.14 2.15-8.79 5.27l3.1 2.38C7.11 7.48 9.36 5.8 12 5.8Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getAuthErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case 'INVALID_TOKEN':
      return '这个登录链接无效，请重新发送一封新的邮件。';
    case 'EXPIRED_TOKEN':
      return '这个登录链接已经过期，请重新发送。';
    case 'ATTEMPTS_EXCEEDED':
      return '这个登录链接已经被使用，请重新获取。';
    case 'new_user_signup_disabled':
      return '当前环境暂未开放自动创建账户。';
    case 'failed_to_create_session':
      return '会话创建失败，请稍后再试。';
    default:
      return errorCode ? '登录没有完成，请重新尝试。' : '';
  }
}

function deriveDisplayName(email: string, name?: string) {
  const trimmedName = name?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return email.split('@')[0] || 'InfoDigest User';
}

export function PasswordlessAuthCard({
  mode,
  availability,
}: PasswordlessAuthCardProps) {
  const searchParams = useSearchParams();
  const copy = authCopy[mode];
  const isRegister = mode === 'register';
  const hasSocialProviders = availability.google || availability.github;
  const hasAnyAuthMethod = hasSocialProviders || availability.magicLink;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pendingProvider, setPendingProvider] = useState<PendingProvider>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dismissRouteError, setDismissRouteError] = useState(false);

  const routeError = dismissRouteError
    ? ''
    : getAuthErrorMessage(searchParams.get('error'));
  const displayedError = error || routeError;

  const handleSocialSignIn = async (provider: 'google' | 'github') => {
    setDismissRouteError(true);
    setPendingProvider(provider);
    setError('');
    setSuccess('');

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: '/feeds',
        newUserCallbackURL: '/feeds',
        errorCallbackURL: copy.errorCallbackURL,
      });

      if (result.error) {
        setError(result.error.message || '登录失败，请稍后重试。');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试。');
    } finally {
      setPendingProvider(null);
    }
  };

  const handleMagicLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDismissRouteError(true);
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('请输入你的邮箱地址。');
      return;
    }

    if (!availability.magicLink) {
      setError('当前环境还没有配置邮箱魔法链接。');
      return;
    }

    setPendingProvider('magic-link');

    try {
      const result = await authClient.signIn.magicLink({
        email: trimmedEmail,
        name: deriveDisplayName(trimmedEmail, name),
        callbackURL: '/feeds',
        newUserCallbackURL: '/feeds',
        errorCallbackURL: copy.errorCallbackURL,
      });

      if (result.error) {
        setError(result.error.message || '发送登录链接失败，请稍后再试。');
        return;
      }

      setSuccess(copy.magicLinkSuccess);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : '发送登录链接失败，请稍后再试。',
      );
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <AuthShell
      eyebrow={copy.eyebrow}
      title={copy.shellTitle}
      description={copy.shellDescription}
    >
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {copy.description}
          </p>
        </div>

        {!hasAnyAuthMethod ? (
          <div
            className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200"
            role="alert"
          >
            当前环境还没有配置可用的登录方式。请先配置 Google、GitHub
            OAuth，或启用邮箱 magic link。
          </div>
        ) : (
          <div className="space-y-5">
            {hasSocialProviders && (
              <div className="space-y-3">
                {availability.google && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between px-4 py-3 text-sm font-medium"
                    onClick={() => void handleSocialSignIn('google')}
                    isLoading={pendingProvider === 'google'}
                    data-testid={`${mode}-google`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <GoogleMark />
                      使用 Google 继续
                    </span>
                    <span className="text-xs text-gray-400">OAuth</span>
                  </Button>
                )}

                {availability.github && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between px-4 py-3 text-sm font-medium"
                    onClick={() => void handleSocialSignIn('github')}
                    isLoading={pendingProvider === 'github'}
                    data-testid={`${mode}-github`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Github className="h-5 w-5" />
                      使用 GitHub 继续
                    </span>
                    <span className="text-xs text-gray-400">OAuth</span>
                  </Button>
                )}
              </div>
            )}

            {availability.magicLink && (
              <>
                {hasSocialProviders && (
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                      或使用邮箱链接
                    </span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                  </div>
                )}

                <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                  {isRegister && (
                    <Input
                      label="昵称"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => {
                        setDismissRouteError(true);
                        setName(event.target.value);
                      }}
                      placeholder="怎么称呼你"
                      data-testid="register-name"
                    />
                  )}

                  <Input
                    label="邮箱"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setDismissRouteError(true);
                      setEmail(event.target.value);
                    }}
                    placeholder="name@example.com"
                    required
                    data-testid={`${mode}-email`}
                  />

                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
                    <div className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      <Mail className="h-4 w-4" />
                      邮箱魔法链接
                    </div>
                    <p className="mt-2">
                      {isRegister
                        ? '我们会向你的邮箱发送一次性注册链接，点开即可创建并登录账户。'
                        : '我们会向你的邮箱发送一次性登录链接，点开即可进入工作台。'}
                    </p>
                  </div>

                  {displayedError && (
                    <div
                      className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/12 dark:text-red-300"
                      role="alert"
                      aria-live="polite"
                    >
                      {displayedError}
                    </div>
                  )}

                  {success && (
                    <div
                      className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300"
                      role="status"
                      aria-live="polite"
                    >
                      {success}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={pendingProvider === 'magic-link'}
                    data-testid={`${mode}-magic-link-submit`}
                  >
                    {copy.magicLinkButton}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {copy.alternativePrompt}
          </span>{' '}
          <Link
            href={copy.alternativeHref}
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
          >
            {copy.alternativeLinkLabel}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
