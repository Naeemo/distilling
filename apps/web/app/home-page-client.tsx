'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  LibraryBig,
  Link2,
  ScanSearch,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { clearExtensionToken, revokeExtensionTokenFromSession } from '@/lib/extension';
import { cn } from '@/lib/utils';

const rawInputs = [
  '行业长文链接',
  '微信文章',
  '播客摘录与 Markdown 笔记',
  '同主题的多篇补充资料',
];

const distilledOutputs = [
  {
    title: '先看结论，再决定要不要读原文',
    detail: '信息中心先给出脱水去重后的高价值输出，让你的阅读从“值不值得继续”开始。',
  },
  {
    title: '热门内容优先命中已消化结果',
    detail: '同一篇内容已经有人处理过时，不必重复等待，直接复用可读版本。',
  },
  {
    title: '需要细节时，再回到阅读器',
    detail: '结论、原文与时间轴状态连在一起，方便继续高亮、标记与回看。',
  },
];

type Feature = {
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
};

const productFlow: Feature[] = [
  {
    eyebrow: 'Collect',
    title: '把输入统一收口，不再分散收藏',
    description: '链接、微信文章、粘贴文本和扩展剪藏都进入同一条记录时间轴，保存动作本身不再打断思路。',
    icon: Link2,
  },
  {
    eyebrow: 'Distill',
    title: '把待看清单压缩成值得读的结论流',
    description: '系统自动抓取、复用、脱水与改写，优先把高价值密度信息推入信息中心，而不是继续把原文堆给你。',
    icon: BrainCircuit,
  },
  {
    eyebrow: 'Return',
    title: '只在需要时回到原文与上下文',
    description: '当某条结论值得深挖时，再进入阅读器查看摘要、原文、高亮和后续关联，形成真正可回访的知识入口。',
    icon: BookOpenText,
  },
];

const useCases: Feature[] = [
  {
    eyebrow: '研究与分析',
    title: '持续跟踪一个主题，但不想反复读相似内容',
    description: '适合研究者、分析师和策略岗位先看差异化结论，再决定是否进入全文。',
    icon: ScanSearch,
  },
  {
    eyebrow: '内容策划',
    title: '每天输入很多灵感与资料，但沉淀速度太慢',
    description: '把零散素材接进统一流水线，先得到可判断、可引用、可继续改写的压缩结果。',
    icon: Sparkles,
  },
  {
    eyebrow: '长期积累',
    title: '希望每次保存都能回到一个长期可用的系统里',
    description: '记录时间轴、信息中心与阅读器连成闭环，保存不再只是归档动作，而是后续理解的起点。',
    icon: LibraryBig,
  },
];

const ctaLinkClass = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-primary-500 px-6 py-3.5 text-base font-medium text-white shadow-[0_16px_36px_rgba(47,86,211,0.24)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-gray-300/80 bg-white/80 px-6 py-3.5 text-base font-medium text-gray-800 transition-[transform,background-color,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-gray-400 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30 dark:hover:bg-white/10',
  ghost:
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition-[background-color,color] duration-200 hover:bg-white/70 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white',
};

export function HomePageClient({ isAuthenticated }: { isAuthenticated: boolean }) {
  const handleLogout = async () => {
    await revokeExtensionTokenFromSession();
    await authClient.signOut();
    clearExtensionToken();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-[#f3efe6] text-gray-950 dark:bg-[#07111f] dark:text-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-950"
      >
        跳到主要内容
      </a>

      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f3efe6]/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#07111f]/78">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <svg
              className="h-8 w-8 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
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
              <span className="block text-xs text-gray-500 dark:text-gray-400">InfoDigest · 信息提纯工作台</span>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link href="/feeds" className={cn(ctaLinkClass.primary, 'px-4 py-2.5 text-sm')}>
                进入信息中心
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className={ctaLinkClass.ghost}>
                登录
              </Link>
              <Link href="/register" className={cn(ctaLinkClass.primary, 'px-4 py-2.5 text-sm')}>
                免费注册
              </Link>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden border-b border-black/5 dark:border-white/10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#f3efe6_0%,#efe8da_44%,#dbe7fb_100%)] dark:bg-[linear-gradient(135deg,#07111f_0%,#0b1c34_48%,#113056_100%)]" />
          <div className="hero-glow absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary-300/35 blur-3xl dark:bg-primary-500/20" />
          <div className="hero-drift absolute right-[-6rem] top-[-5rem] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl dark:bg-cyan-400/10" />
          <div className="absolute inset-y-0 right-0 hidden w-[50vw] bg-[linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.12))] lg:block dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.05))]" />

          <div className="relative lg:grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="flex items-center px-4 py-14 sm:px-6 lg:px-0 lg:py-10">
              <div className="mx-auto w-full max-w-7xl lg:pr-6">
                <div className="max-w-2xl lg:pl-8 xl:pl-12">
                  <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary-700 dark:text-primary-300">
                    InfoDigest
                  </p>
                  <h1 className="mt-6 max-w-4xl text-balance text-5xl font-semibold tracking-[-0.07em] text-gray-950 sm:text-6xl lg:text-[5.6rem] xl:text-[6.1rem] dark:text-white">
                    知萃
                    <span className="mt-5 block max-w-3xl text-[0.34em] font-medium leading-[1.02] tracking-[-0.045em] text-gray-900 dark:text-white/92">
                      把海量输入，提纯成值得行动的结论流。
                    </span>
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-gray-700 dark:text-gray-300">
                    面向研究者、内容工作者和高频信息消费者的
                    <span className="font-semibold text-gray-950 dark:text-white">信息提纯工作台</span>。
                    链接、微信文章、粘贴文本与扩展剪藏统一进入 Records，系统自动去重、复用、脱水与改写，先把高价值结论送进信息中心；需要细节时，再回到原文。
                  </p>

                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {[
                      '先读结论，不先掉进原文',
                      '同主题输入合并处理，避免重复阅读',
                      '记录、输出与后续阅读在同一条工作流里闭环',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {isAuthenticated ? (
                    <div className="mt-10 flex flex-wrap gap-4">
                      <Link href="/feeds" className={ctaLinkClass.primary}>
                        进入信息中心
                      </Link>
                      <Link href="/records" className={ctaLinkClass.secondary}>
                        查看添加记录
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                      <Link href="/register" className={ctaLinkClass.primary}>
                        免费开始使用
                      </Link>
                      <Link href="/login" className={ctaLinkClass.secondary}>
                        已有账号，直接登录
                      </Link>
                    </div>
                  )}

                  <div className="mt-14 grid gap-6 border-t border-black/10 pt-6 text-sm text-gray-600 sm:grid-cols-3 dark:border-white/10 dark:text-gray-300">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Inputs</p>
                      <p className="mt-2 text-base font-medium text-gray-900 dark:text-white">链接、微信、笔记、剪藏统一收口</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Flow</p>
                      <p className="mt-2 text-base font-medium text-gray-900 dark:text-white">自动抓取、复用、脱水与改写</p>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Output</p>
                      <p className="mt-2 text-base font-medium text-gray-900 dark:text-white">先给结论流，再回到原文</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center px-4 pb-14 sm:px-6 lg:px-0 lg:pb-10">
              <div className="hero-float relative mx-auto w-full max-w-7xl lg:pl-6">
                <div className="absolute left-2 top-10 hidden xl:block">
                  <div className="rounded-full border border-white/40 bg-white/55 px-4 py-2 text-xs font-medium tracking-[0.18em] text-gray-600 shadow-[0_10px_32px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                    RAW → SIGNAL
                  </div>
                </div>

                <div className="overflow-hidden rounded-[2.4rem] border border-white/45 bg-[#09111f] p-5 text-white shadow-[0_38px_100px_rgba(15,23,42,0.28)] dark:border-white/10 lg:mr-8 lg:p-6 xl:mr-12">
                  <div className="grid gap-5 xl:grid-cols-[0.78fr_minmax(0,1.22fr)]">
                    <div className="rounded-[2rem] bg-white/[0.05] p-5">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
                        <span>Records</span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[10px]">持续输入</span>
                      </div>
                      <div className="mt-6 space-y-3">
                        {rawInputs.map((item, index) => (
                          <div
                            key={item}
                            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/82"
                            style={{ transform: `translateX(${index % 2 === 0 ? '0px' : '8px'})` }}
                          >
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Input {index + 1}</p>
                            <p className="mt-2 leading-6">{item}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex items-center gap-3 text-xs text-white/45">
                        <Waypoints className="h-4 w-4" aria-hidden="true" />
                        <span>抓取、去重、复用、脱水与改写自动串联</span>
                      </div>
                    </div>

                    <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] p-5">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/55">
                        <span>信息中心</span>
                        <span className="rounded-full bg-emerald-400/18 px-2 py-1 text-[10px] text-emerald-200">高价值密度输出</span>
                      </div>
                      <div className="mt-6 space-y-4">
                        {distilledOutputs.map((item, index) => (
                          <div key={item.title} className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
                            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Signal 0{index + 1}</p>
                            <h2 className="mt-2 text-xl font-semibold leading-8 text-white">{item.title}</h2>
                            <p className="mt-2 text-sm leading-6 text-white/72">{item.detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-xs text-white/60 sm:grid-cols-3">
                        <div className="rounded-2xl bg-black/12 px-3 py-3">
                          <p className="font-mono uppercase tracking-[0.18em] text-white/35">状态</p>
                          <p className="mt-2 text-sm font-medium text-white">可追踪</p>
                        </div>
                        <div className="rounded-2xl bg-black/12 px-3 py-3">
                          <p className="font-mono uppercase tracking-[0.18em] text-white/35">结果</p>
                          <p className="mt-2 text-sm font-medium text-white">先结论</p>
                        </div>
                        <div className="rounded-2xl bg-black/12 px-3 py-3">
                          <p className="font-mono uppercase tracking-[0.18em] text-white/35">回流</p>
                          <p className="mt-2 text-sm font-medium text-white">再进原文</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/5 bg-[#f6f1e8] py-20 dark:border-white/10 dark:bg-[#08111d]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.86fr_minmax(0,1fr)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">核心工作流</p>
                <h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                  不是替你多存内容，而是替你先完成第一轮判断。
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-gray-600 dark:text-gray-300">
                  知萃不是帮你再建一个收藏夹，而是把保存后的第一轮筛选、压缩和重组先做掉，让你把注意力留给真正值得展开的内容。
                </p>
              </div>
              <div className="grid gap-10">
                {productFlow.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="grid gap-4 border-t border-black/10 py-6 first:border-t-0 first:pt-0 sm:grid-cols-[72px_minmax(0,1fr)] dark:border-white/10"
                  >
                    <div className="flex items-start justify-between sm:block">
                      <p className="font-mono text-sm uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
                        0{index + 1}
                      </p>
                      <feature.icon className="mt-2 h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">{feature.eyebrow}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/5 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.88fr_minmax(0,1fr)]">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">适合谁</p>
                <h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                  适合信息密度高、输入频率高，而且不想把注意力浪费在整理动作上的人。
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                  当你的工作依赖持续输入时，真正稀缺的不是保存入口，而是更快完成筛选、压缩和回看的能力。
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {useCases.map((item) => (
                  <div key={item.title} className="border-t border-black/10 pt-5 dark:border-white/10">
                    <item.icon className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">{item.eyebrow}</p>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight text-gray-950 dark:text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0a1320] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">最后一屏</p>
                <h2 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                  不是多一个收藏入口，而是少掉一大段重复吸收信息的时间。
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">
                  你负责把内容扔进来，知萃负责把它变成可判断、可回看、可继续推进的高价值输出。
                </p>
              </div>
              <div className="flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
                <p className="text-sm leading-7 text-white/70">
                  从 Records 开始输入，在信息中心先看结果，需要细节时再进入 Reader。
                </p>
                {isAuthenticated ? (
                  <Link href="/feeds" className={cn(ctaLinkClass.primary, 'w-full justify-between')}>
                    进入信息中心
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link href="/register" className={cn(ctaLinkClass.primary, 'w-full justify-between')}>
                    免费开始使用
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
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
