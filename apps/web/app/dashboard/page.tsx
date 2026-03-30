'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { QuickCollect } from '@/components/QuickCollect';
import { api } from '@/lib/api';
import { useContentStore } from '@/stores/content';
import { formatRelativeTime, truncate } from '@/lib/utils';
import type { Content } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const {
    contents,
    isLoading,
    filterStatus,
    searchQuery,
    setContents,
    setLoading,
    setFilterStatus,
    setSearchQuery,
  } = useContentStore();

  useEffect(() => {
    loadContents();
  }, [filterStatus, searchQuery]);

  const loadContents = async () => {
    setLoading(true);
    try {
      const response = await api.contents.list({
        status: filterStatus || undefined,
        search: searchQuery || undefined,
      });
      setContents(response.items, response.total);
    } catch (error) {
      console.error('Failed to load contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'UNREAD': return '未读';
      case 'READING': return '阅读中';
      case 'READ': return '已读';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNREAD': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
      case 'READING': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'READ': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">知识库</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
            从这里提交内容、查看当前阅读状态，并继续进入阅读与复习。
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
          保存后会自动开始抓取、复用与摘要。
        </div>
      </div>

      {/* Quick Collect - 支持链接、文本、Markdown */}
      <QuickCollect onSuccess={loadContents} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {[
            { value: null, label: '全部' },
            { value: 'UNREAD', label: '未读' },
            { value: 'READING', label: '阅读中' },
            { value: 'READ', label: '已读' },
          ].map((filter) => (
            <button
              key={filter.label}
              onClick={() => setFilterStatus(filter.value)}
              data-testid={`dashboard-filter-${filter.value?.toLowerCase() ?? 'all'}`}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                filterStatus === filter.value
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex-1"></div>

        <Input
          placeholder="搜索标题或内容..."
          aria-label="搜索内容"
          data-testid="dashboard-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">暂无内容，添加一个链接开始吧</p>
          </div>
        ) : (
          contents.map((content: Content) => (
            <Card
              key={content.id}
              isHoverable
              onClick={() => router.push(`/reader/${content.id}`)}
              className="cursor-pointer"
              data-testid={`content-card-${content.id}`}
            >
              <CardBody>
                <div className="flex items-start gap-4">
                  {/* Cover */}
                  <div className="w-24 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                    {content.metadata?.coverImage ? (
                      <img
                        src={content.metadata.coverImage}
                        alt={content.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {content.title}
                    </h3>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {content.url && (
                        <>
                          <span className="truncate">{new URL(content.url).hostname}</span>
                          {' · '}
                        </>
                      )}
                      <span>{formatRelativeTime(content.createdAt)}</span>
                    </p>

                    {content.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {truncate(content.summary, 150)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(content.status)}`}>
                        {getStatusLabel(content.status)}
                      </span>

                      {/* Reading Progress */}
                      {content.readingProgress > 0 && content.status !== 'READ' && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          已读 {content.readingProgress}%
                        </span>
                      )}
                      
                      {content.tags?.map((tag) => (
                        <span
                          key={tag.tag.id}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: tag.tag.color + '20', color: tag.tag.color }}
                        >
                          {tag.tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
