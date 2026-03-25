import { HighlightService } from './highlight.service';
import { CreateHighlightDto, UpdateHighlightDto } from './dto';
export declare class HighlightController {
    private readonly highlightService;
    constructor(highlightService: HighlightService);
    create(req: any, dto: CreateHighlightDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        contentId: string;
        color: string;
        highlightText: string;
        note: string | null;
        position: import("@prisma/client/runtime/library").JsonValue;
    }>;
    update(req: any, id: string, dto: UpdateHighlightDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        contentId: string;
        color: string;
        highlightText: string;
        note: string | null;
        position: import("@prisma/client/runtime/library").JsonValue;
    }>;
    delete(req: any, id: string): Promise<{
        success: boolean;
    }>;
}
