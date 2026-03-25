// 类型定义

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  subscription: 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';
  createdAt: string;
}

export interface Content {
  id: string;
  url: string | null;
  title: string;
  contentText: string | null;
  summary: string | null;
  status: 'UNREAD' | 'READING' | 'READ' | 'ARCHIVED';
  sourceType: 'WEB' | 'RSS' | 'NEWSLETTER' | 'MANUAL';
  metadata: {
    author?: string;
    publishDate?: string;
    coverImage?: string;
    siteName?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  tags: ContentTag[];
  highlights: Highlight[];
}

export interface ContentTag {
  tag: Tag;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  contentCount?: number;
}

export interface Highlight {
  id: string;
  highlightText: string;
  note: string | null;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  position: {
    startOffset: number;
    endOffset: number;
    paragraphIndex?: number;
  };
  createdAt: string;
}

export interface Summary {
  id: string;
  summaryType: 'QUICK' | 'DETAILED' | 'BULLET' | 'QA';
  summaryText: string;
  tokensUsed: number;
  model: string;
  createdAt: string;
}

export interface Review {
  id: string;
  contentId: string;
  content: Content;
  reviewDate: string;
  completedAt: string | null;
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' | null;
  interval: number;
  easeFactor: number;
  repetitions: number;
}
