import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';
export declare class AiService {
    private configService;
    private prisma;
    private redis;
    private readonly openai;
    constructor(configService: ConfigService, prisma: PrismaService, redis: Redis);
    generateSummary(contentId: string, type: 'QUICK' | 'DETAILED' | 'BULLET' | 'QA', onChunk?: (chunk: string) => void): Promise<{
        summaryId: string;
        summaryText: string;
        tokensUsed: number;
    }>;
    getSummaries(contentId: string): Promise<{
        id: string;
        createdAt: Date;
        contentId: string;
        summaryType: import("@prisma/client").$Enums.SummaryType;
        summaryText: string;
        tokensUsed: number;
        model: string;
    }[]>;
    private getCacheKey;
    private buildPrompt;
    private estimateTokens;
    private fallbackSummarize;
}
