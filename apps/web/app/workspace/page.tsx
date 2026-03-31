'use client';

import { startTransition, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import type { WorkspaceArticleListItem } from '@/types';

const statusStyles: Record<WorkspaceArticleListItem['status'], string> = {
  GENERATING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusLabels: Record<WorkspaceArticleListItem['status'], string> = {
  GENERATING: '生成中',
  READY: '已就绪',
  FAILED: '生成失败',
};

export default function WorkspacePage() {
  const router = useRouter();
  const [articles, setArticles] = useState<WorkspaceArticleListItem[]>([]);
  const [initialIdea, setInitialIdea] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadArticles();
  }, []);

  useEffect(() => {
    if (!articles.some((article) => article.status === 'GENERATING')) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadArticles({ silent: true });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [articles]);

  const loadArticles = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await api.workspace.listArticles();
      startTransition(() => {
        setArticles(response);
        setError(null);
      });
    } catch (loadError) {
      console.error('Failed to load workspace articles:', loadError);
      setError(loadError instanceof Error ? loadError.message : '加载工作区失败');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const handleCreate = async () => {
    if (initialIdea.trim().length < 4) {
      setError('请先输入更完整一点的初始想法。');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const article = await api.workspace.createArticle(initialIdea.trim());
      router.push(`/workspace/${article.id}`);
    } catch (createError) {
      console.error('Failed to create workspace article:', createError);
      setError(createError instanceof Error ? createError.message : '创建文章失败');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 dark:text-white">工作区</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">
            从一个初始想法开始，调用你已有的信息库作为参考，生成一篇可以继续打磨的文章草稿。
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
          先生成草稿，再继续编辑，比从空白页开始更轻松。
        </div>
      </div>

      <Card className="mb-8 border-gray-200/80 bg-white/90 dark:border-gray-800 dark:bg-gray-900/80">
        <CardHeader>
          <CardTitle>新建文章</CardTitle>
          <CardDescription>输入你此刻最想梳理的问题、判断或写作方向。</CardDescription>
        </CardHeader>
        <CardBody className="space-y-4">
          <Textarea
            value={initialIdea}
            onChange={(event) => setInitialIdea(event.target.value)}
            placeholder="例如：我想梳理 AI agent 在团队协作里的实际价值，尤其是任务拆分、可靠性和成本。"
            className="min-h-[148px]"
          />
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              工作区会优先从你的个人信息库中检索参考，再异步生成一版草稿。
            </p>
            <Button onClick={handleCreate} isLoading={isCreating}>
              生成文章草稿
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">历史文章</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">按最近更新时间排序。</p>
        </div>
        <button
          type="button"
          onClick={() => void loadArticles()}
          className="text-sm text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300"
        >
          刷新
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : articles.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-gray-500 dark:text-gray-400">
              还没有工作区文章。把一个想法扔进来，我们先帮你起草第一版。
            </CardBody>
          </Card>
        ) : (
          articles.map((article) => (
            <Card
              key={article.id}
              isHoverable
              onClick={() => router.push(`/workspace/${article.id}`)}
              className="cursor-pointer"
              data-testid={`workspace-card-${article.id}`}
            >
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                      {article.title || '未命名草稿'}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {article.initialIdea}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[article.status]}`}>
                    {statusLabels[article.status]}
                  </span>
                </div>

                <p className="line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {article.excerpt || article.generationError || '系统正在根据你的信息库和初始想法整理第一版草稿。'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>更新于 {formatRelativeTime(article.updatedAt)}</span>
                  <span>{article.referenceCount} 条参考</span>
                  {article.hasFewReferences && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      参考较少
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
