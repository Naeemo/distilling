import type { Metadata } from "next";
import { Manrope } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: "知萃 InfoDigest - AI驱动的信息消化工具",
  description: "采集、摘要、阅读、复习，一站式信息管理。让AI帮你高效处理和记忆知识。",
  keywords: ["知识管理", "AI摘要", "阅读工具", "间隔重复", "知识库"],
  authors: [{ name: "InfoDigest Team" }],
  openGraph: {
    title: "知萃 InfoDigest",
    description: "AI驱动的信息消化工具",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
