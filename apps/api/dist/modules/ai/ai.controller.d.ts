import { Response } from 'express';
import { AiService } from './ai.service';
import { SummarizeDto } from './dto';
export declare class AiController {
    private readonly aiService;
    constructor(aiService: AiService);
    summarize(req: any, dto: SummarizeDto, res: Response): Promise<void>;
    getSummaries(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        contentId: string;
        summaryType: import("@prisma/client").$Enums.SummaryType;
        summaryText: string;
        tokensUsed: number;
        model: string;
    }[]>;
}
