'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import type { WorkspaceArticleDetail } from '@/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const statusLabels: Record<WorkspaceArticleDetail['status'], string> = {
  GENERATING: '生成中',
  READY: '已就绪',
  FAILED: '生成失败',
};

export default function WorkspaceArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const saveTimerRef = useRef<number | null>(null);
  const lastSyncedRef = useRef<{ title: string; body: string } | null>(null);

  const [article, setArticle] = useState<WorkspaceArticleDetail | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('等待生成完成后即可继续编辑。');

  useEffect(() => {
    void loadArticle();

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [params.id]);

  useEffect(() => {
    if (article?.status !== 'GENERATING') {
      return;
    }

    const timer = window.setInterval(() => {
      void loadArticle({ silent: true });
    }, 4000);

    return () => window.clearInterval(timer);
  }, [article?.status, params.id]);

  useEffect(() => {
    if (!article || article.status === 'GENERATING') {
      return;
    }

    if (lastSyncedRef.current && lastSyncedRef.current.title === title && lastSyncedRef.current.body === body) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    setSaveState('saving');
    setSaveMessage('正在自动保存...');

    saveTimerRef.current = window.setTimeout(() => {
      void saveDraft();
    }, 900);
  }, [title, body, article]);

  const loadArticle = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await api.workspace.getArticle(params.id);
      setArticle(response);
      setTitle(response.title || '');
      setBody(response.body || '');
      lastSyncedRef.current = {
        title: response.title || '',
        body: response.body || '',
      };
      setSaveMessage(
        response.status === 'GENERATING'
          ? '系统正在根据参考资料生成草稿。'
          : response.status === 'FAILED'
            ? '本次生成失败了，你可以补充编辑或重试。'
            : '自动保存已开启。',
      );
      setSaveState('idle');
    } catch (error) {
      console.error('Failed to load workspace article:', error);
      toast({
        title: '加载失败',
        description: error instanceof Error ? error.message : '文章详情加载失败',
        variant: 'destructive',
      });
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const saveDraft = async () => {
    if (!article) {
      return;
    }

    try {
      const updated = await api.workspace.updateArticle(article.id, { title, body });
      setArticle((current) => current ? { ...current, ...updated, status: 'READY' } : current);
      lastSyncedRef.current = { title, body };
      setSaveState('saved');
      setSaveMessage(`已自动保存 · ${formatRelativeTime(new Date().toISOString())}`);
    } catch (error) {
      console.error('Failed to save workspace article:', error);
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : '自动保存失败');
      toast({
        title: '自动保存失败',
        description: error instanceof Error ? error.message : '请稍后再试',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = async () => {
    if (!article) {
      return;
    }

    setIsRetrying(true);

    try {
      const updated = await api.workspace.retryArticle(article.id);
      setArticle((current) => current ? { ...current, ...updated, references: current.references } : current);
      setSaveState('idle');
      setSaveMessage('已重新发起生成，正在刷新草稿内容。');
    } catch (error) {
      console.error('Failed to retry workspace article:', error);
      toast({
        title: '重试失败',
        description: error instanceof Error ? error.message : '请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Card>
          <CardBody className="py-12 text-center text-gray-500 dark:text-gray-400">
            没找到这篇工作区文章。
          </CardBody>
        </Card>
      </div>
    );
  }

  const isGenerating = article.status === 'GENERATING';

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">Workspace Article</p>
                <CardTitle className="mt-2 text-2xl">文章草稿</CardTitle>
                <CardDescription className="mt-2">
                  先让系统起草，再继续把它改成你真正想表达的版本。
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {statusLabels[article.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardBody className="space-y-5">
            <Input
              label="标题"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isGenerating}
              placeholder="生成完成后可继续修改标题"
            />
            <Textarea
              label="正文"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={isGenerating}
              className="min-h-[520px]"
              placeholder={isGenerating ? '系统正在生成正文...' : '在这里继续打磨你的文章'}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-gray-50/80 px-4 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/60">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200">保存状态</p>
                <p className={
                  saveState === 'error'
                    ? 'text-red-600 dark:text-red-300'
                    : 'text-gray-500 dark:text-gray-400'
                }
                >
                  {saveMessage}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {article.status === 'FAILED' && (
                  <Button variant="outline" onClick={handleRetry} isLoading={isRetrying}>
                    重试生成
                  </Button>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  最近更新 {formatRelativeTime(article.updatedAt)}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>初始想法</CardTitle>
            <CardDescription>这段输入决定了工作区第一次起稿的方向。</CardDescription>
          </CardHeader>
          <CardBody>
            <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">{article.initialIdea}</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>参考来源</CardTitle>
            <CardDescription>
              {article.hasFewReferences
                ? '当前参考较少，草稿可先写，但建议后续继续补充相关资料。'
                : '这些内容来自你的信息库，可用于回看证据和上下文。'}
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-4">
            {article.references.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂时没有可展示的参考来源。</p>
            ) : (
              article.references.map((reference) => (
                <div key={`${reference.contentId}-${reference.rank}`} className="rounded-2xl border border-gray-200/80 p-4 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{reference.title}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        匹配得分 {reference.score.toFixed(2)} · {reference.reason}
                      </p>
                    </div>
                    <Link
                      href={`/reader/${reference.contentId}`}
                      className="text-sm text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-300"
                    >
                      查看原文
                    </Link>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {reference.summary || '这条参考还没有摘要，可回到原文继续查看。'}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
