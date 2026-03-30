'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';

export default function IntegrationsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const generateToken = async () => {
    setIsGenerating(true);
    setStatus('');

    try {
      const response = await fetch('/api/integration/token', {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(error?.message || 'Failed to generate API token');
      }

      const payload = (await response.json()) as { token?: string };
      if (!payload.token) {
        throw new Error('Missing API token in response');
      }

      setToken(payload.token);
      setStatus('已生成新的 Integration Token。旧 Token 已失效。');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate API token';
      setStatus(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeToken = async () => {
    setIsRevoking(true);
    setStatus('');

    try {
      const response = await fetch('/api/integration/token', {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(error?.message || 'Failed to revoke API token');
      }

      setToken(null);
      setStatus('Integration Token 已撤销。浏览器扩展和快捷指令需要重新同步。');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to revoke API token';
      setStatus(message);
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToken = async () => {
    if (!token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      setStatus('Token 已复制。请立即保存，刷新页面后将不会再次显示。');
    } catch {
      setStatus('复制失败，请手动复制当前显示的 Token。');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Integrations
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Web 会话只用于浏览器内登录。扩展、快捷指令和自动化客户端请使用单独的 Integration Token。
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Integration Token
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            每次生成都会轮换旧 Token。数据库只保存哈希值，原始 Token 仅在这里显示一次。
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void generateToken()} isLoading={isGenerating}>
              生成新 Token
            </Button>
            <Button
              variant="secondary"
              onClick={() => void copyToken()}
              disabled={!token}
            >
              复制 Token
            </Button>
            <Button
              variant="ghost"
              onClick={() => void revokeToken()}
              isLoading={isRevoking}
            >
              撤销 Token
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
            {token ? (
              <code className="block break-all text-sm text-gray-800 dark:text-gray-100">
                {token}
              </code>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                当前没有可显示的原始 Token。生成后请立即复制保存。
              </p>
            )}
          </div>

          {status && (
            <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            iOS Shortcut
          </h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            iOS 快捷指令应请求 <code>/api/integration/collect</code>，并通过
            <code> X-API-Token </code>传递此 Token。
          </p>
          <p>
            链接保存使用 <code>{'{"type":"url","url":"..." }'}</code>，
            纯文本保存使用 <code>{'{"type":"text","title":"...","contentText":"..." }'}</code>。
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
