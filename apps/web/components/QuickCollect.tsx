'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useContentStore } from '@/stores/content';

interface QuickCollectProps {
  onSuccess?: () => void;
}

// 检测文本类型
function detectInputType(text: string): 'url' | 'wechat' | 'text' {
  const trimmed = text.trim();
  
  // 检测是否是 URL
  const urlPattern = /^https?:\/\/.+/i;
  if (urlPattern.test(trimmed)) {
    // 检测是否是微信链接
    if (trimmed.includes('mp.weixin.qq.com') || 
        trimmed.includes('weixin.qq.com') ||
        trimmed.includes('wechat.com')) {
      return 'wechat';
    }
    return 'url';
  }
  
  return 'text';
}

// 从微信分享文本中提取链接和标题
function parseWechatShare(text: string): { url: string; title: string } | null {
  // 匹配常见的微信分享格式
  // 格式: 标题
  // 链接
  const pattern1 = /(.+?)\n+(https?:\/\/[^\s]+)/;
  const match1 = text.match(pattern1);
  if (match1) {
    return { title: match1[1].trim(), url: match1[2].trim() };
  }
  
  // 格式: 【标题】
  // 链接
  const pattern2 = /【(.+?)】\n+(https?:\/\/[^\s]+)/;
  const match2 = text.match(pattern2);
  if (match2) {
    return { title: match2[1].trim(), url: match2[2].trim() };
  }
  
  // 格式: 纯链接
  const pattern3 = /(https?:\/\/[^\s]+)/;
  const match3 = text.match(pattern3);
  if (match3) {
    return { title: '微信文章', url: match3[1].trim() };
  }
  
  return null;
}

// 从文本中提取第一行作为标题
function extractTitle(text: string): string {
  const lines = text.trim().split('\n');
  const firstLine = lines[0].trim();
  
  // 如果第一行太长，截断
  if (firstLine.length > 100) {
    return firstLine.slice(0, 100) + '...';
  }
  
  // 如果第一行是 URL，返回默认标题
  if (firstLine.startsWith('http')) {
    return '采集的内容';
  }
  
  return firstLine || '采集的内容';
}

export function QuickCollect({ onSuccess }: QuickCollectProps) {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputMode, setInputMode] = useState<'auto' | 'url' | 'text'>('auto');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addContent = useContentStore((state) => state.addContent);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      const type = inputMode === 'auto' ? detectInputType(inputText) : inputMode;
      
      if (type === 'url' || type === 'wechat') {
        // URL 模式 - 直接创建链接
        const url = inputText.trim();
        const content = await api.contents.create(url);
        addContent(content);
      } else {
        // 文本模式
        const wechatData = parseWechatShare(inputText);
        
        if (wechatData && wechatData.url.includes('mp.weixin.qq.com')) {
          // 微信分享文本 - 提取链接并创建
          const content = await api.contents.create(wechatData.url);
          addContent(content);
        } else {
          // 纯文本/Markdown 模式
          const title = extractTitle(inputText);
          const content = await api.contents.createText(title, inputText.trim());
          addContent(content);
        }
      }
      
      setInputText('');
      onSuccess?.();
    } catch (error: any) {
      alert(error.message || '添加失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 允许默认粘贴行为
  };

  const currentType = inputMode === 'auto' ? detectInputType(inputText) : inputMode;
  
  const getPlaceholder = () => {
    switch (inputMode) {
      case 'url':
        return '粘贴文章链接，如 https://example.com/article';
      case 'text':
        return '粘贴文章内容、笔记或 Markdown...\n\n支持：\n- 纯文本\n- Markdown 格式\n- 微信分享文本（会自动提取链接）';
      default:
        return '粘贴链接、文本或微信分享内容...\n\n自动识别：\n- 网页链接 → 抓取文章内容\n- 微信分享 → 提取公众号文章\n- 纯文本/Markdown → 直接保存';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">快速采集</h3>
          <div className="flex gap-2">
            {[
              { value: 'auto', label: '自动识别' },
              { value: 'url', label: '链接' },
              { value: 'text', label: '文本/Markdown' },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setInputMode(mode.value as any)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  inputMode === mode.value
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            placeholder={getPlaceholder()}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                       resize-none transition-all"
            rows={inputMode === 'text' || (inputMode === 'auto' && currentType === 'text') ? 8 : 3}
          />
          
          {/* 预览提示 */}
          {inputText.trim() && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>检测:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                currentType === 'url' ? 'bg-blue-100 text-blue-700' :
                currentType === 'wechat' ? 'bg-green-100 text-green-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {currentType === 'url' ? '网页链接' : 
                 currentType === 'wechat' ? '微信文章' : '文本/Markdown'}
              </span>
              {currentType === 'url' && (
                <span className="text-xs">将自动抓取文章内容</span>
              )}
              {currentType === 'wechat' && (
                <span className="text-xs">将提取公众号文章内容</span>
              )}
              {currentType === 'text' && (
                <span className="text-xs">将直接保存为笔记</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 提示: 从微信分享时，直接复制完整文本粘贴即可自动提取链接
            </p>
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!inputText.trim()}
            >
              {isSubmitting ? '保存中...' : '保存内容'}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
