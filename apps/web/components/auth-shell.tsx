import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, BrainCircuit, LibraryBig, Waypoints } from 'lucide-react';

type Highlight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const defaultHighlights: Highlight[] = [
  {
    title: '统一收口',
    description: '链接、微信文章、粘贴文本与剪藏统一进入同一条记录链路。',
    icon: Waypoints,
  },
  {
    title: '先给结论',
    description: '系统自动去重、复用、脱水与改写，优先输出高价值密度信息。',
    icon: BrainCircuit,
  },
  {
    title: '再回到原文',
    description: '需要细节时，再进入阅读器查看摘要、原文和后续上下文。',
    icon: LibraryBig,
  },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  highlights = defaultHighlights,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  highlights?: Highlight[];
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3efe6] text-gray-950 dark:bg-[#07111f] dark:text-white">
      <div className="relative isolate min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#f3efe6_0%,#efe8da_44%,#dbe7fb_100%)] dark:bg-[linear-gradient(135deg,#07111f_0%,#0b1c34_48%,#113056_100%)]" />
        <div className="hero-glow absolute -left-24 top-24 h-64 w-64 rounded-full bg-primary-300/35 blur-3xl dark:bg-primary-500/20" />
        <div className="hero-drift absolute right-[-6rem] top-[-5rem] h-72 w-72 rounded-full bg-amber-200/45 blur-3xl dark:bg-cyan-400/10" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-12 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.8fr)] lg:px-8 lg:py-10">
          <section className="flex min-w-0 flex-col justify-between gap-10 lg:py-6">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex items-center gap-3">
                <svg
                  className="h-9 w-9 text-primary-500"
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
                <span>
                  <span className="block text-lg font-semibold tracking-tight">知萃</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">InfoDigest · 信息提纯工作台</span>
                </span>
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-medium text-gray-700 transition-[background-color,border-color,color] duration-200 hover:border-black/15 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-white/20 dark:hover:bg-white/8"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                返回首页
              </Link>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary-700 dark:text-primary-300">
                {eyebrow}
              </p>
              <h1 className="mt-6 text-balance text-5xl font-semibold tracking-[-0.06em] text-gray-950 sm:text-6xl dark:text-white">
                {title}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 text-gray-700 dark:text-gray-300">
                {description}
              </p>
            </div>

            <div className="grid gap-4 md:max-w-xl">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/50 bg-white/55 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <item.icon className="h-5 w-5 text-primary-600 dark:text-primary-300" aria-hidden="true" />
                  <h2 className="mt-4 text-lg font-semibold text-gray-950 dark:text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center py-4 lg:py-8">
            <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/88 p-2 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#09111f]/82">
              <div className="rounded-[1.5rem] bg-white px-6 py-6 dark:bg-[#0c1728] sm:px-7 sm:py-7">
                {children}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
