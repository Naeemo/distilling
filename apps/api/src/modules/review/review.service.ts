import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async getTodayReviews(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
        reviewDate: {
          gte: today,
          lt: tomorrow,
        },
        completedAt: null,
      },
      include: {
        content: {
          include: {
            tags: {
              include: { tag: true },
            },
          },
        },
      },
      orderBy: { reviewDate: 'asc' },
    });

    return reviews;
  }

  async getUpcomingReviews(userId: string, days: number = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
        reviewDate: {
          gte: today,
          lt: endDate,
        },
        completedAt: null,
      },
      include: {
        content: true,
      },
      orderBy: { reviewDate: 'asc' },
    });

    return reviews;
  }

  async completeReview(
    userId: string,
    reviewId: string,
    rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY',
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, userId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // 简化版 SM-2 算法
    const intervals = {
      AGAIN: 1,
      HARD: Math.max(1, Math.round(review.interval * 1.2)),
      GOOD: Math.max(1, Math.round(review.interval * 2.5)),
      EASY: Math.max(1, Math.round(review.interval * 4)),
    };

    const easeFactors = {
      AGAIN: Math.max(1.3, review.easeFactor - 0.2),
      HARD: Math.max(1.3, review.easeFactor - 0.15),
      GOOD: review.easeFactor,
      EASY: review.easeFactor + 0.15,
    };

    const newInterval = intervals[rating];
    const newEaseFactor = easeFactors[rating];
    const newRepetitions = rating === 'AGAIN' ? 0 : review.repetitions + 1;

    // 计算下次复习日期
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    // 更新当前复习记录
    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        completedAt: new Date(),
        rating,
      },
    });

    // 创建下次复习计划
    await this.prisma.review.create({
      data: {
        userId,
        contentId: review.contentId,
        reviewDate: nextReviewDate,
        interval: newInterval,
        easeFactor: newEaseFactor,
        repetitions: newRepetitions,
      },
    });

    return {
      success: true,
      nextReviewDate,
      interval: newInterval,
    };
  }

  async getReviewStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalDue,
      completedToday,
      totalReviews,
      averageEaseFactor,
    ] = await Promise.all([
      this.prisma.review.count({
        where: {
          userId,
          reviewDate: { lt: today },
          completedAt: null,
        },
      }),
      this.prisma.review.count({
        where: {
          userId,
          completedAt: {
            gte: today,
          },
        },
      }),
      this.prisma.review.count({
        where: { userId },
      }),
      this.prisma.review.aggregate({
        where: { userId },
        _avg: { easeFactor: true },
      }),
    ]);

    return {
      totalDue,
      completedToday,
      totalReviews,
      averageEaseFactor: averageEaseFactor._avg.easeFactor || 2.5,
    };
  }
}
