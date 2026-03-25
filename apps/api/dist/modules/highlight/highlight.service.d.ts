import { PrismaService } from '../../prisma/prisma.service';
export declare class HighlightService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, data: {
        contentId: string;
        highlightText: string;
        position: {
            startOffset: number;
            endOffset: number;
            paragraphIndex?: number;
        };
        color?: string;
        note?: string;
    }): Promise<{
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
    update(userId: string, id: string, data: {
        note?: string;
        color?: string;
    }): Promise<{
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
    delete(userId: string, id: string): Promise<{
        success: boolean;
    }>;
}
