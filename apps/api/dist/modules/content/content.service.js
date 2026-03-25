"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_module_1 = require("../../redis/redis.module");
const client_1 = require("@prisma/client");
const ioredis_1 = __importDefault(require("ioredis"));
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
let Readability;
try {
    const { Readability: R } = require('@mozilla/readability');
    Readability = R;
}
catch {
    Readability = null;
}
let ContentService = class ContentService {
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async createFromUrl(userId, url, tagIds) {
        const existing = await this.prisma.content.findFirst({
            where: { userId, url },
        });
        if (existing) {
            throw new common_1.BadRequestException('Content with this URL already exists');
        }
        const { title, contentText, metadata } = await this.fetchWebContent(url);
        const content = await this.prisma.content.create({
            data: {
                userId,
                url,
                title,
                contentText,
                metadata,
                sourceType: 'WEB',
            },
        });
        if (tagIds && tagIds.length > 0) {
            await this.prisma.contentTag.createMany({
                data: tagIds.map((tagId) => ({
                    contentId: content.id,
                    tagId,
                })),
                skipDuplicates: true,
            });
        }
        await this.createInitialReview(userId, content.id);
        return content;
    }
    async createFromText(userId, title, contentText, tagIds) {
        const content = await this.prisma.content.create({
            data: {
                userId,
                title,
                contentText,
                sourceType: 'MANUAL',
            },
        });
        if (tagIds && tagIds.length > 0) {
            await this.prisma.contentTag.createMany({
                data: tagIds.map((tagId) => ({
                    contentId: content.id,
                    tagId,
                })),
                skipDuplicates: true,
            });
        }
        await this.createInitialReview(userId, content.id);
        return content;
    }
    async findAll(userId, params) {
        const { status, tagId, search, page = 1, limit = 20 } = params;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        if (tagId) {
            where.tags = {
                some: { tagId },
            };
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { contentText: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.content.findMany({
                where,
                include: {
                    tags: {
                        include: { tag: true },
                    },
                    _count: {
                        select: { highlights: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.content.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
        };
    }
    async findOne(userId, id) {
        const content = await this.prisma.content.findFirst({
            where: { id, userId },
            include: {
                tags: {
                    include: { tag: true },
                },
                highlights: true,
                summaries: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!content) {
            throw new common_1.NotFoundException('Content not found');
        }
        return content;
    }
    async updateStatus(userId, id, status) {
        const content = await this.prisma.content.findFirst({
            where: { id, userId },
        });
        if (!content) {
            throw new common_1.NotFoundException('Content not found');
        }
        const validStatus = status;
        if (!Object.values(client_1.ContentStatus).includes(validStatus)) {
            throw new common_1.BadRequestException('Invalid status');
        }
        return this.prisma.content.update({
            where: { id },
            data: { status: validStatus },
        });
    }
    async updateReadingProgress(userId, id, data) {
        const content = await this.prisma.content.findFirst({
            where: { id, userId },
        });
        if (!content) {
            throw new common_1.NotFoundException('Content not found');
        }
        const now = new Date();
        const updateData = {
            readingProgress: Math.min(100, Math.max(0, data.progress)),
            lastReadAt: now,
        };
        if (data.position) {
            updateData.readingPosition = {
                ...data.position,
                timestamp: now.toISOString(),
            };
        }
        if (data.readingTime) {
            updateData.readingTime = content.readingTime + data.readingTime;
        }
        if (data.progress >= 90 && content.status !== 'READ') {
            updateData.status = 'READ';
        }
        else if (data.progress > 0 && content.status === 'UNREAD') {
            updateData.status = 'READING';
        }
        return this.prisma.content.update({
            where: { id },
            data: updateData,
        });
    }
    async archive(userId, id) {
        const content = await this.prisma.content.findFirst({
            where: { id, userId },
        });
        if (!content) {
            throw new common_1.NotFoundException('Content not found');
        }
        return this.prisma.content.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
    }
    async fetchWebContent(url) {
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 30000,
            });
            const html = response.data;
            const $ = cheerio.load(html);
            const title = $('title').text() || $('h1').first().text() || 'Untitled';
            const author = $('meta[name="author"]').attr('content') ||
                $('meta[property="article:author"]').attr('content');
            const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                $('meta[name="publishdate"]').attr('content');
            const coverImage = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content');
            const siteName = $('meta[property="og:site_name"]').attr('content');
            let contentText = '';
            if (Readability) {
                const { JSDOM } = require('jsdom');
                const dom = new JSDOM(html, { url });
                const reader = new Readability(dom.window.document);
                const article = reader.parse();
                contentText = article?.textContent || '';
            }
            else {
                contentText = $('article').text() ||
                    $('main').text() ||
                    $('.content').text() ||
                    $('body').text();
            }
            contentText = contentText
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, '\n')
                .trim()
                .substring(0, 50000);
            return {
                title: title.trim(),
                contentText,
                metadata: {
                    author,
                    publishDate,
                    coverImage,
                    siteName,
                },
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to fetch URL: ${error.message}`);
        }
    }
    async createInitialReview(userId, contentId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await this.prisma.review.create({
            data: {
                userId,
                contentId,
                reviewDate: tomorrow,
            },
        });
    }
};
exports.ContentService = ContentService;
exports.ContentService = ContentService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ioredis_1.default])
], ContentService);
//# sourceMappingURL=content.service.js.map