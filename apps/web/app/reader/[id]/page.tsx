'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useContentStore } from '@/stores/content';
import { formatDate, truncate } from '@/lib/utils';
import { ContentPositionCard, RelatedContentList } from '@/components/knowledge-graph';
import type { Content, Highlight, Summary } from '@/types';

type ViewMode = 'summary' | 'full';
type SummaryType = 'QUICK' | 'DETAILED' | 'BULLET';

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  
  const { selectedContent, setSelectedContent } = useContentStore();
  
  const [content, setContent] = useState<Content | null>(selectedContent);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [summaryType, setSummaryType] = useState<SummaryType>('QUICK');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });
  const [readingProgress, setReadingProgress] = useState(0);
  const [isRestoringPosition, setIsRestoringPosition] = useState(true);
  
  const articleRef = useRef<HTMLElement>(null);
  const progressSaveRef = useRef({ progress: 0, position: { scrollY: 0 }, readingTime: 0 });
  const readingStartTime = useRef(Date.now());
  const hasScrolled = useRef(false);

  // 加载内容
  useEffect(() => {
    loadContent();
    
    // 清理函数：记录阅读时间
    return () => {
      const duration = Math.floor((Date.now() - readingStartTime.current) / 1000);
      if (duration > 5 && contentId) {
        saveProgress(true);
      }
    };
  }, [contentId]);

  // 恢复阅读位置
  useEffect(() => {
    if (!content || !articleRef.current || !isRestoringPosition) return;
    
    // 如果有保存的阅读位置，恢复滚动
    if (content.readingPosition?.scrollY && content.readingPosition.scrollY > 0) {
      // 延迟恢复，确保页面渲染完成
      setTimeout(() => {
        window.scrollTo({
          top: content.readingPosition!.scrollY,
          behavior: 'smooth'
        });
        setIsRestoringPosition(false);
      }, 300);
    } else {
      setIsRestoringPosition(false);
    }
  }, [content, isRestoringPosition]);

  // 监听滚动，计算进度
  useEffect(() => {
    const handleScroll = () => {
      hasScrolled.current = true;
      
      if (!articleRef.current) return;
      
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
      
      setReadingProgress(progress);
      
      // 保存到 ref 供防抖函数使用
      progressSaveRef.current = {
        progress,
        position: { scrollY: scrollTop },
        readingTime: Math.floor((Date.now() - readingStartTime.current) / 1000)
      };
      
      // 防抖保存进度
      debouncedSaveProgress();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const data = await api.contents.get(contentId);
      setContent(data);
      setSelectedContent(data);
      setHighlights(data.highlights || []);
      setReadingProgress(data.readingProgress || 0);
    } catch (error) {
      console.error('Failed to load content:', error);
      router.push('/feeds');
    } finally {
      setIsLoading(false);
    }
  };

  // 防抖保存进度（3秒延迟）
  const debouncedSaveProgress = useCallback(
    debounce(() => {
      saveProgress(false);
    }, 3000),
    [contentId]
  );

  // 保存阅读进度
  const saveProgress = async (isUnmount = false) => {
    if (!contentId || !hasScrolled.current) return;
    
    const { progress, position, readingTime } = progressSaveRef.current;
    
    try {
      await api.contents.updateProgress(contentId, {
        progress,
        position,
        readingTime: readingTime > 0 ? readingTime : undefined
      });
      
      // 更新本地状态
      setContent(prev => prev ? { 
        ...prev, 
        readingProgress: progress,
        readingPosition: { ...position, timestamp: new Date().toISOString() },
        readingTime: (prev.readingTime || 0) + (readingTime > 0 ? readingTime : 0)
      } : prev);
    } catch (error) {
      if (!isUnmount) {
        console.error('Failed to save progress:', error);
      }
    }
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setStreamingText('');
    
    try {
      await api.ai.summarize(contentId, summaryType, (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });
      await loadContent(); // 重新加载获取完整摘要
      setStreamingText('');
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setShowHighlightMenu(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setShowHighlightMenu(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setSelectedText(text);
    setSelectionPosition({ x: rect.left + rect.width / 2, y: rect.top - 40 });
    setShowHighlightMenu(true);
  }, []);

  const handleHighlight = async (color: string) => {
    if (!selectedText) return;
    
    try {
      const highlight = await api.highlights.create({
        contentId,
        highlightText: selectedText,
        position: { startOffset: 0, endOffset: selectedText.length },
        color: color as any,
      });
      setHighlights([...highlights, highlight]);
      setShowHighlightMenu(false);
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  };

  const updateStatus = async (status: Content['status']) => {
    try {
      await api.contents.updateStatus(contentId, status);
      setContent((prev) => prev ? { ...prev, status } : prev);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (isLoading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/feeds')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            data-testid="reader-back"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>

          {/* Progress Display */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              已读 {readingProgress}%
            </span>
            <select
              value={content.status}
              onChange={(e) => updateStatus(e.target.value as Content['status'])}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              aria-label="阅读状态"
              data-testid="reader-status-select"
            >
              <option value="UNREAD">未读</option>
              <option value="READING">阅读中</option>
              <option value="READ">已读</option>
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <article ref={articleRef} className="max-w-4xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {content.metadata?.author && (
              <span>作者: {content.metadata.author}</span>
            )}
            {content.metadata?.publishDate && (
              <span>{formatDate(content.metadata.publishDate)}</span>
            )}
            {content.url && (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                查看原文
              </a>
            )}
          </div>

          {/* Reading Progress Info */}
          {(content.readingProgress > 0 || content.readingTime > 0) && (
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              {content.readingProgress > 0 && (
                <span>上次读到 {content.readingProgress}%</span>
              )}
              {content.readingTime > 0 && (
                <span>累计阅读 {Math.floor(content.readingTime / 60)} 分钟</span>
              )}
              {content.readCount > 0 && (
                <span>阅读 {content.readCount} 次</span>
              )}
            </div>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('summary')}
            data-testid="reader-summary-tab"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'summary'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            摘要
          </button>
          <button
            onClick={() => setViewMode('full')}
            data-testid="reader-full-tab"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'full'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            全文
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {viewMode === 'summary' ? (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white">AI 摘要</h2>
                    <div className="flex gap-2">
                      {(['QUICK', 'DETAILED', 'BULLET'] as SummaryType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSummaryType(type)}
                          className={`text-xs px-2 py-1 rounded ${
                            summaryType === type
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {type === 'QUICK' && '快速'}
                          {type === 'DETAILED' && '详细'}
                          {type === 'BULLET' && '要点'}
                        </button>
                      ))}
                      <Button
                        size="sm"
                        onClick={handleGenerateSummary}
                        isLoading={isGenerating}
                        disabled={isGenerating}
                        data-testid="reader-generate-summary"
                      >
                        {isGenerating ? '生成中...' : '生成摘要'}
                      </Button>
                    </div>
                  </div>

                  {streamingText ? (
                    <div className="prose max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{streamingText}<span className="animate-pulse">▊</span></p>
                    </div>
                  ) : content.summary ? (
                    <div className="prose max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">{content.summary}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      摘要通常会在保存后自动开始生成。若暂时还没出来，可以稍等片刻或手动重新生成。
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Highlights */}
              {highlights.length > 0 && (
                <Card>
                  <CardBody>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4">我的高亮</h2>
                    <div className="space-y-3">
                      {highlights.map((highlight) => (
                        <div
                          key={highlight.id}
                          className="p-3 rounded-lg"
                          style={{
                            backgroundColor:
                              highlight.color === 'yellow' ? '#fef3c7' :
                              highlight.color === 'green' ? '#d1fae5' :
                              highlight.color === 'blue' ? '#dbeafe' :
                              '#fce7f3'
                          }}
                        >
                          <p className="text-sm text-gray-900">{highlight.highlightText}</p>
                          {highlight.note && (
                            <p className="text-xs text-gray-500 mt-1">💬 {highlight.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </>
          ) : (
            /* Full Text View */
            <Card>
              <CardBody>
                <div
                  className="prose max-w-none dark:prose-invert"
                  onMouseUp={handleTextSelection}
                >
                  {content.contentText ? (
                    content.contentText.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 leading-relaxed text-gray-900 dark:text-gray-100">{paragraph}</p>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">暂无正文内容</p>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Knowledge Graph Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            信息位置与关联
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Position Card */}
            <ContentPositionCard contentId={contentId} />
            
            {/* Related Content List */}
            <RelatedContentList contentId={contentId} />
          </div>
        </div>
      </article>

      {/* Highlight Menu */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 flex gap-1"
        style={{
          left: selectionPosition.x - 80,
          top: selectionPosition.y,
          opacity: showHighlightMenu ? 1 : 0,
          pointerEvents: showHighlightMenu ? 'auto' : 'none',
          transition: 'opacity 0.15s',
        }}
      >
        {[
          { color: 'yellow', bg: '#fbbf24' },
          { color: 'green', bg: '#34d399' },
          { color: 'blue', bg: '#60a5fa' },
          { color: 'pink', bg: '#f472b6' },
        ].map(({ color, bg }) => (
          <button
            key={color}
            onClick={() => handleHighlight(color)}
            className="w-8 h-8 rounded-full hover:scale-110 transition-transform"
            style={{ backgroundColor: bg }}
            title={`高亮 - ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
