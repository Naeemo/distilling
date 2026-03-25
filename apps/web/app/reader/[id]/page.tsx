'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useContentStore } from '@/stores/content';
import { formatDate, truncate } from '@/lib/utils';
import type { Highlight, Summary } from '@/types';

type ViewMode = 'summary' | 'full';
type SummaryType = 'QUICK' | 'DETAILED' | 'BULLET';

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  
  const { selectedContent, setSelectedContent } = useContentStore();
  
  const [content, setContent] = useState(selectedContent);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [summaryType, setSummaryType] = useState<SummaryType>('QUICK');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadContent();
  }, [contentId]);

  const loadContent = async () => {
    setIsLoading(true);
    try {
      const data = await api.contents.get(contentId);
      setContent(data);
      setSelectedContent(data);
      setHighlights(data.highlights || []);
    } catch (error) {
      console.error('Failed to load content:', error);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
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

  const updateStatus = async (status: string) => {
    try {
      await api.contents.updateStatus(contentId, status);
      setContent((prev) => prev ? { ...prev, status } : prev);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (isLoading || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>

          <div className="flex items-center gap-2">
            <select
              value={content.status}
              onChange={(e) => updateStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="UNREAD">未读</option>
              <option value="READING">阅读中</option>
              <option value="READ">已读</option>
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{content.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
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
                className="text-primary-600 hover:underline"
              >
                查看原文
              </a>
            )}
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('summary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'summary'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            摘要
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'full'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            全文
          </button>
        </div>

        {/* Summary View */}
        <div className="space-y-6">
          {viewMode === 'summary' ? (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold">AI 摘要</h2>
                    <div className="flex gap-2">
                      {(['QUICK', 'DETAILED', 'BULLET'] as SummaryType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSummaryType(type)}
                          className={`text-xs px-2 py-1 rounded ${
                            summaryType === type
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-600'
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
                      >
                        {isGenerating ? '生成中...' : '生成摘要'}
                      </Button>
                    </div>
                  </div>

                  {streamingText ? (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{streamingText}<span className="animate-pulse">▊</span></p>
                    </div>
                  ) : content.summary ? (
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap">{content.summary}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      点击"生成摘要"获取 AI 生成的内容摘要
                    </p>
                  )}
                </CardBody>
              </Card>

              {/* Highlights */}
              {highlights.length > 0 && (
                <Card>
                  <CardBody>
                    <h2 className="font-semibold mb-4">我的高亮</h2>
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
                          <p className="text-sm">{highlight.highlightText}</p>
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
                  className="prose max-w-none"
                  onMouseUp={handleTextSelection}
                >
                  {content.contentText ? (
                    content.contentText.split('\n\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 leading-relaxed">{paragraph}</p>
                    ))
                  ) : (
                    <p className="text-gray-500">暂无正文内容</p>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </article>

      {/* Highlight Menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-1"
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
