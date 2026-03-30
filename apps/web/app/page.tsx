'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const { isAuthenticated, isLoading, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const renderHeaderActions = () => {
    if (isLoading) {
      return <div className="h-10 w-40" aria-hidden="true" />;
    }

    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button>进入知识库</Button>
          </Link>
          <Button variant="ghost" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button variant="ghost">登录</Button>
        </Link>
        <Link href="/register">
          <Button>免费注册</Button>
        </Link>
      </div>
    );
  };

  const renderHeroActions = () => {
    if (isLoading) {
      return <div className="mt-10 h-12" aria-hidden="true" />;
    }

    if (isAuthenticated) {
      return (
        <div className="mt-10 flex justify-center">
          <Link href="/dashboard">
            <Button size="lg">进入知识库</Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/register">
          <Button size="lg">免费开始使用</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary" size="lg">已有账号？登录</Button>
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="text-xl font-bold">知萃</span>
          </div>
          
          {renderHeaderActions()}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight">
              AI驱动的
              <br />
              <span className="text-primary-600">信息消化</span>工具
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              采集、摘要、阅读、复习，一站式信息管理。
              <br />
              让AI帮你高效处理和记忆知识。
            </p>
            
            {renderHeroActions()}
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  title: '智能采集',
                  description: '粘贴链接自动抓取，支持网页、RSS等多种来源',
                  icon: '📥',
                },
                {
                  title: 'AI摘要',
                  description: '一键生成快速或详细摘要，节省阅读时间',
                  icon: '🤖',
                },
                {
                  title: '高亮笔记',
                  description: '边读边标注，支持多色高亮和添加笔记',
                  icon: '📝',
                },
                {
                  title: '间隔重复',
                  description: '科学复习算法，帮助知识长期记忆',
                  icon: '🧠',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center">
            © {new Date().getFullYear()} 知萃 InfoDigest. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
