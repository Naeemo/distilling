"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReviewService = class ReviewService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTodayReviews(userId) {
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
    async getUpcomingReviews(userId, days = 7) {
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
    async completeReview(userId, reviewId, rating) {
        const review = await this.prisma.review.findFirst({
            where: { id: reviewId, userId },
        });
        if (!review) {
            throw new common_1.NotFoundException('Review not found');
        }
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
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
        await this.prisma.review.update({
            where: { id: reviewId },
            data: {
                completedAt: new Date(),
                rating,
            },
        });
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
    async getReviewStats(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalDue, completedToday, totalReviews, averageEaseFactor,] = await Promise.all([
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
};
exports.ReviewService = ReviewService;
exports.ReviewService = ReviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewService);
//# sourceMappingURL=review.service.js.map