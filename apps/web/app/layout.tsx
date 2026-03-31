import type { Metadata } from "next";
import { Manrope } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from '@/components/ui/toaster';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: "知萃 InfoDigest - 把待看的输入堆提纯成真正值得读的结论流",
  description: "面向研究者、内容工作者和高频信息消费者的信息提纯工作台。统一采集、自动去重脱水，先输出高价值结论，再决定是否进入原文。",
  keywords: ["信息提纯", "信息脱水", "AI 摘要", "信息中心", "内容消化"],
  authors: [{ name: "InfoDigest Team" }],
  openGraph: {
    title: "知萃 InfoDigest",
    description: "把待看的输入堆提纯成真正值得读的结论流",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${manrope.variable} min-h-screen bg-gray-50 text-gray-900 antialiased dark:bg-gray-900 dark:text-gray-100`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
