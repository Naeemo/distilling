export declare class CreateHighlightDto {
    contentId: string;
    highlightText: string;
    position: {
        startOffset: number;
        endOffset: number;
        paragraphIndex?: number;
    };
    color?: string;
    note?: string;
}
export declare class UpdateHighlightDto {
    note?: string;
    color?: string;
}
