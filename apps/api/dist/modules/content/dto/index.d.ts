export declare class CreateContentDto {
    url: string;
    tags?: string[];
}
export declare class CreateTextContentDto {
    title: string;
    contentText: string;
    tags?: string[];
}
export declare class UpdateStatusDto {
    status: string;
}
export declare class UpdateReadingProgressDto {
    progress: number;
    position?: {
        scrollY: number;
        paragraphIndex?: number;
    };
    readingTime?: number;
}
