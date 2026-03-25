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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_module_1 = require("../../redis/redis.module");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = require("crypto");
let AiService = class AiService {
    constructor(configService, prisma, redis) {
        this.configService = configService;
        this.prisma = prisma;
        this.redis = redis;
        try {
            const { OpenAI } = require('openai');
            this.openai = new OpenAI({
                apiKey: this.configService.get('OPENAI_API_KEY'),
                baseURL: this.configService.get('OPENAI_BASE_URL'),
            });
        }
        catch {
            this.openai = null;
        }
    }
    async generateSummary(contentId, type, onChunk) {
        const content = await this.prisma.content.findUnique({
            where: { id: contentId },
        });
        if (!content) {
            throw new common_1.NotFoundException('Content not found');
        }
        const cacheKey = this.getCacheKey(content.contentText || '', type);
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            const cachedData = JSON.parse(cached);
            const summary = await this.prisma.summary.create({
                data: {
                    contentId,
                    summaryType: type,
                    summaryText: cachedData.text,
                    tokensUsed: cachedData.tokensUsed,
                    model: cachedData.model,
                },
            });
            return {
                summaryId: summary.id,
                summaryText: cachedData.text,
                tokensUsed: cachedData.tokensUsed,
            };
        }
        const prompt = this.buildPrompt(content.contentText || '', type);
        const model = this.configService.get('OPENAI_MODEL', 'gpt-3.5-turbo');
        const maxTokens = type === 'QUICK' ? 200 : 500;
        let summaryText = '';
        let tokensUsed = 0;
        if (this.openai) {
            try {
                const stream = await this.openai.chat.completions.create({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that summarizes content accurately and concisely.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    max_tokens: maxTokens,
                    stream: true,
                });
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    summaryText += content;
                    if (onChunk) {
                        onChunk(content);
                    }
                }
                tokensUsed = this.estimateTokens(prompt + summaryText);
            }
            catch (error) {
                console.error('OpenAI API error:', error);
                summaryText = this.fallbackSummarize(content.contentText || '', type);
                tokensUsed = 0;
            }
        }
        else {
            summaryText = this.fallbackSummarize(content.contentText || '', type);
            tokensUsed = 0;
        }
        const summary = await this.prisma.summary.create({
            data: {
                contentId,
                summaryType: type,
                summaryText,
                tokensUsed,
                model,
            },
        });
        await this.prisma.content.update({
            where: { id: contentId },
            data: { summary: summaryText },
        });
        await this.redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify({ text: summaryText, tokensUsed, model }));
        return {
            summaryId: summary.id,
            summaryText,
            tokensUsed,
        };
    }
    async getSummaries(contentId) {
        return this.prisma.summary.findMany({
            where: { contentId },
            orderBy: { createdAt: 'desc' },
        });
    }
    getCacheKey(content, type) {
        const hash = (0, crypto_1.createHash)('sha256').update(content + type).digest('hex');
        return `summary:${hash}`;
    }
    buildPrompt(content, type) {
        const maxLength = 8000;
        const truncated = content.length > maxLength
            ? content.substring(0, maxLength) + '...'
            : content;
        switch (type) {
            case 'QUICK':
                return `Please provide a quick summary of the following content in 3-5 sentences:\n\n${truncated}`;
            case 'DETAILED':
                return `Please provide a detailed summary of the following content with structured paragraphs:\n\n${truncated}`;
            case 'BULLET':
                return `Please summarize the following content as 3-7 bullet points:\n\n${truncated}`;
            case 'QA':
                return `Please summarize the following content in a Q&A format:\n\n${truncated}`;
            default:
                return `Please summarize the following content:\n\n${truncated}`;
        }
    }
    estimateTokens(text) {
        return Math.ceil(text.length / 3);
    }
    fallbackSummarize(content, type) {
        const sentences = content
            .replace(/([.!?。！？])\s+/g, "$1\n")
            .split('\n')
            .filter(s => s.trim().length > 20);
        if (sentences.length === 0) {
            return content.substring(0, 200) + '...';
        }
        switch (type) {
            case 'QUICK':
                return sentences.slice(0, 5).join(' ');
            case 'BULLET':
                return sentences.slice(0, 7).map(s => `• ${s.trim()}`).join('\n');
            default:
                return sentences.slice(0, 10).join(' ');
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(redis_module_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        ioredis_1.default])
], AiService);
//# sourceMappingURL=ai.service.js.map