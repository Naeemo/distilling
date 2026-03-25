import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知萃 InfoDigest - AI驱动的信息消化工具",
  description: "采集、摘要、阅读、复习，一站式信息管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
