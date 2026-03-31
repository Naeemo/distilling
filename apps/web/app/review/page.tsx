'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/utils';
import type { Review } from '@/types';

export default function ReviewPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    totalDue: 0,
    completedToday: 0,
    totalReviews: 0,
    averageEaseFactor: 2.5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<Review | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reviewsData, statsData] = await Promise.all([
        api.reviews.today(),
        api.reviews.stats(),
      ]);
      setReviews(reviewsData);
      setStats(statsData);
      if (reviewsData.length > 0 && !activeReview) {
        setActiveReview(reviewsData[0]);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRate = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!activeReview) return;

    try {
      await api.reviews.complete(activeReview.id, rating);
      
      // 移除已完成的复习
      const remaining = reviews.filter((r) => r.id !== activeReview.id);
      setReviews(remaining);
      setActiveReview(remaining.length > 0 ? remaining[0] : null);
      setShowAnswer(false);
      
      // 刷新统计
      const statsData = await api.reviews.stats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to complete review:', error);
    }
  };

  const getRatingLabel = (rating: string) => {
    switch (rating) {
      case 'AGAIN': return { label: '完全忘记', color: 'bg-red-600', interval: '1天' };
      case 'HARD': return { label: '困难', color: 'bg-orange-500', interval: '2-3天' };
      case 'GOOD': return { label: '正常', color: 'bg-blue-500', interval: '3-7天' };
      case 'EASY': return { label: '简单', color: 'bg-green-500', interval: '7-14天' };
      default: return { label: rating, color: 'bg-gray-500', interval: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" data-testid="review-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push('/feeds')}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">今日复习</h1>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400">基于间隔重复算法，帮助您长期记忆知识</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.totalDue}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">待复习</p>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">今日完成</p>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReviews}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">总复习数</p>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageEaseFactor.toFixed(1)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">平均难度</p>
            </CardBody>
          </Card>
        </div>

        {/* Active Review */}
        <div className="space-y-6">
          {activeReview ? (
            <>
              <div className="text-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  剩余 {reviews.length} 项待复习
                </span>
              </div>

              <Card className="min-h-[400px]">
                <CardBody className="flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {activeReview.content.title}
                    </h2>
                    
                    {activeReview.content.summary ? (
                      <div className="prose max-w-none dark:prose-invert mb-6">
                        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {showAnswer
                            ? activeReview.content.summary
                            : truncate(activeReview.content.summary, 200) + '...'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        暂无摘要，<button
                          onClick={() => router.push(`/reader/${activeReview.content.id}`)}
                          className="text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          去阅读页面生成
                        </button>
                      </p>
                    )}

                    {!showAnswer && activeReview.content.summary && (
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="mx-auto block px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        显示完整摘要
                      </button>
                    )}
                  </div>

                  {showAnswer && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                        您还记得这些内容吗？
                      </p>
                      
                      <div className="grid grid-cols-4 gap-3">
                        {(['AGAIN', 'HARD', 'GOOD', 'EASY'] as const).map((rating) => {
                          const { label, color, interval } = getRatingLabel(rating);
                          return (
                            <button
                              key={rating}
                              onClick={() => handleRate(rating)}
                              className={`${color} text-white p-4 rounded-lg hover:opacity-90 transition-opacity`}
                            >
                              <p className="font-semibold">{label}</p>
                              <p className="text-xs opacity-90">{interval}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          ) : (
            <div className="text-center py-20" data-testid="review-empty-state">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">今日复习完成！</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">您已完成所有待复习的内容，明天再来吧~</p>
              
              <Button onClick={() => router.push('/feeds')}>
                返回信息中心
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
