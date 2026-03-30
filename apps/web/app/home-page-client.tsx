'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { clearExtensionToken, revokeExtensionTokenFromSession } from '@/lib/extension';

export function HomePageClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const handleLogout = async () => {
    await revokeExtensionTokenFromSession();
    await authClient.signOut();
    clearExtensionToken();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f3] text-gray-950 dark:bg-gray-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f7f7f3]/85 backdrop-blur dark:border-white/10 dark:bg-gray-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-primary-500"
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
            <div>
              <span className="block text-lg font-semibold tracking-tight">知萃</span>
              <span className="block text-[11px] uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Info Digest</span>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button>进入知识库</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">登录</Button>
              </Link>
              <Link href="/register">
                <Button>免费注册</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-black/5 dark:border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(69,108,244,0.18),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(15,23,42,0.14),transparent_28%)]" />
          <div className="relative mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-16 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.26em] text-primary-600 dark:text-primary-300">
                信息入口，直接进入消化
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-6xl lg:text-7xl dark:text-white">
                保存一篇内容，
                <br />
                立刻得到一份
                <span className="text-primary-500">可继续思考</span>
                的入口。
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
                知萃把链接、微信文章、扩展剪藏和快捷采集统一接进一条消化流水线。抓取、复用、摘要、阅读与复习在同一个工作台里连续发生。
              </p>

              {isAuthenticated ? (
                <div className="mt-10 flex flex-wrap gap-4">
                  <Link href="/dashboard">
                    <Button size="lg">进入工作台</Button>
                  </Link>
                  <Link href="/dashboard/activity">
                    <Button variant="outline" size="lg">查看添加记录</Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Link href="/register">
                    <Button size="lg">免费开始使用</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg">已有账号，直接登录</Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur dark:border-white/10 dark:bg-gray-900/80">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">消化流水线</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">热门内容可直接复用已有结果</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  即时反馈
                </span>
              </div>

              <div className="space-y-4 pt-5">
                {[
                  { title: '抓取中', detail: '正文、封面、来源元数据自动整理', tone: 'bg-sky-500' },
                  { title: '复用中', detail: '跨用户复用已消化结果，减少等待与成本', tone: 'bg-violet-500' },
                  { title: '摘要中', detail: '快速摘要先出来，阅读入口马上可用', tone: 'bg-amber-500' },
                  { title: '已消化', detail: '进入阅读、高亮、复习与知识图谱', tone: 'bg-emerald-500' },
                ].map((step, index) => (
                  <div key={step.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-3 w-3 rounded-full ${step.tone}`} />
                      {index < 3 && <span className="mt-2 h-full w-px bg-gray-200 dark:bg-gray-800" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{step.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/5 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_minmax(0,1fr)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">为什么更快</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">
                  不是把链接堆起来，而是把每次提交都变成一条可继续推进的记录。
                </h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {[
                  { title: '统一入口', description: '粘贴、扩展、快捷指令都进同一条处理链，不再分散在不同工具里。', metric: '3种来源' },
                  { title: '跨用户复用', description: '同一篇热门内容已被别人消化过时，新提交会直接复用现成结果。', metric: '接近秒开' },
                  { title: '时间轴可回看', description: '每一次添加都有时间锚点、来源和阶段状态，排查和回顾都更清楚。', metric: '可追踪' },
                  { title: '阅读后续连贯', description: '摘要出来后自然进入高亮、标签、复习，不需要在不同页面里来回切换。', metric: '一条链路' },
                ].map((feature) => (
                  <div key={feature.title} className="border-t border-gray-200 py-5 dark:border-gray-800">
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-300">{feature.metric}</p>
                    <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 rounded-[2rem] bg-gray-950 px-6 py-10 text-white sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">工作方式</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  适合信息密度高、输入频率高、又不想把注意力花在整理动作上的人。
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  你只负责把内容扔进来，系统负责把它排进时间轴、判断是否可复用、生成第一层消化结果，并把后续阅读入口准备好。
                </p>
              </div>
              <div className="space-y-4">
                {[
                  '保存后立即看到阶段状态',
                  '重复提交能回溯到原始记录',
                  '热门内容优先命中共享结果',
                  '阅读、复习、图谱探索都接在后面',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 py-12 text-gray-500 dark:border-white/10 dark:text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center">
            © {new Date().getFullYear()} 知萃 InfoDigest. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
