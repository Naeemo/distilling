'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import type { ContentSubmission } from '@/types';

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSourceLabel(source: ContentSubmission['source']) {
  switch (source) {
    case 'QUICK_PASTE':
      return '快速粘贴';
    case 'BROWSER_EXTENSION':
      return '浏览器剪藏';
    case 'IOS_SHORTCUT':
      return '快捷采集';
    default:
      return source;
  }
}

function getStatusLabel(status: ContentSubmission['status']) {
  switch (status) {
    case 'FETCHING':
      return '抓取中';
    case 'REUSING':
      return '复用中';
    case 'SUMMARIZING':
      return '摘要中';
    case 'DIGESTED':
      return '已消化';
    case 'DUPLICATE':
      return '重复提交';
    case 'FAILED':
      return '处理失败';
    default:
      return status;
  }
}

function getStatusClass(status: ContentSubmission['status']) {
  switch (status) {
    case 'FETCHING':
      return 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    case 'REUSING':
      return 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    case 'SUMMARIZING':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'DIGESTED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'DUPLICATE':
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    case 'FAILED':
      return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

function hasReusedSummary(metadata: ContentSubmission['metadata']) {
  return Boolean(metadata && metadata.reusedSummary);
}

export default function ActivityPage() {
  const [items, setItems] = useState<ContentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await api.contents.submissions({ limit: '200' });
        setItems(response);
      } catch (error) {
        console.error('Failed to load content submissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, ContentSubmission[]>>((groups, item) => {
      const key = formatDate(item.submittedAt);
      groups[key] ??= [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [items]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950 dark:text-white mb-2">添加记录</h1>
        <p className="max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
          这里按时间轴保留每一次提交，方便回看是什么时候加的、从哪里来的，以及现在处理到哪一步。
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">还没有添加记录，先去保存一篇内容吧。</p>
        </div>
      ) : (
        Object.entries(groupedItems).map(([day, records]) => (
          <section key={day} className="space-y-3">
            <div className="sticky top-0 z-10 py-1">
              <div className="inline-flex rounded-full border border-gray-200/80 bg-white/90 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-200">
                {day}
              </div>
            </div>

            {records.map((item) => (
              <Card key={item.id} className="scroll-mt-24 overflow-hidden">
                <CardBody>
                  <div id={`submission-${item.id}`} className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="space-y-2 border-b border-gray-100 pb-4 md:border-b-0 md:border-r md:border-gray-100 md:pb-0 md:pr-4 dark:border-gray-800">
                      <a
                        href={`#submission-${item.id}`}
                        className="block text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                      >
                        {formatDateTime(item.submittedAt)}
                      </a>
                      <p className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                        {formatRelativeTime(item.submittedAt)}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.contentId ? (
                            <Link
                              href={`/reader/${item.contentId}`}
                              className="block text-lg font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.title}
                            </h2>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/30 dark:text-blue-300">
                            {getSourceLabel(item.source)}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </div>

                      {item.url && (
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                          {item.url}
                        </p>
                      )}

                      {hasReusedSummary(item.metadata) && (
                        <p className="text-sm text-violet-700 dark:text-violet-300">
                          已复用现成的消化结果，这类内容通常会几乎瞬间完成。
                        </p>
                      )}

                      {item.status === 'DUPLICATE' && item.duplicateOfSubmission && (
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          这条内容之前已在 {formatDateTime(item.duplicateOfSubmission.submittedAt)} 添加过。
                          <a
                            href={`#submission-${item.duplicateOfSubmission.id}`}
                            className="ml-2 text-gray-500 underline underline-offset-2 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                          >
                            定位到原记录
                          </a>
                        </p>
                      )}

                      {item.status === 'FETCHING' && (
                        <p className="text-sm text-sky-700 dark:text-sky-300">
                          正在抓取正文与元数据，完成后会继续进入摘要阶段。
                        </p>
                      )}

                      {item.status === 'REUSING' && (
                        <p className="text-sm text-violet-700 dark:text-violet-300">
                          正在复用已有的抓取与消化结果，通常会很快完成。
                        </p>
                      )}

                      {item.status === 'SUMMARIZING' && (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          正在生成摘要与前段消化结果，完成后会自动切到“已消化”。
                        </p>
                      )}

                      {item.status === 'DIGESTED' && (
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          内容已经完成初步消化，可以直接进入阅读。
                        </p>
                      )}

                      {item.status === 'FAILED' && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {item.errorMessage || '处理过程中出现问题，但提交记录已经保留。'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
