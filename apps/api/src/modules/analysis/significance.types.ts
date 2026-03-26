/**
 * 重要性评估类型定义
 * 
 * 评估维度：
 * - 信源权威性 (domain reputation)
 * - 信息新颖性 (与用户已有知识的对比)
 * - 用户相关性 (基于用户兴趣标签)
 * - 时效性 (时间衰减因子)
 */

export type SignificanceLevel = 'high' | 'medium' | 'low';

export interface UserProfile {
  userId: string;
  interestTags: string[];      // 用户兴趣标签
  preferredDomains?: string[];  // 偏好域名
  blockedDomains?: string[];    // 屏蔽域名
  readingHistory?: Array<{
    contentId: string;
    title: string;
    tags: string[];
    readAt: Date;
  }>;  // 阅读历史（用于新颖性计算）
}

export interface ContentMetadata {
  url: string;
  title: string;
  author?: string;
  publishDate?: Date;
  sourceDomain: string;
  contentType: string;  // breaking | analysis | research | opinion | data | tutorial | noise
  wordCount?: number;
  tags?: string[];
}

export interface SignificanceInput {
  content: {
    title: string;
    text: string;
    summary?: string;
  };
  metadata: ContentMetadata;
  userProfile: UserProfile;
}

export interface DimensionScores {
  domainAuthority: number;     // 信源权威性 0-1
  novelty: number;             // 信息新颖性 0-1
  relevance: number;           // 用户相关性 0-1
  timeliness: number;          // 时效性 0-1
}

export interface SignificanceResult {
  score: number;               // 综合得分 0-1
  level: SignificanceLevel;    // 重要性等级
  dimensionScores: DimensionScores;  // 各维度得分
  breakdown: {
    domainAuthority: {
      score: number;
      details: string[];
    };
    novelty: {
      score: number;
      details: string[];
    };
    relevance: {
      score: number;
      details: string[];
    };
    timeliness: {
      score: number;
      details: string[];
    };
  };
  recommendations?: string[];  // 改进建议
}

// 权重配置
export interface SignificanceWeights {
  domainAuthority: number;     // 信源权威性权重
  novelty: number;             // 信息新颖性权重
  relevance: number;           // 用户相关性权重
  timeliness: number;          // 时效性权重
}

// 域名信誉库
export interface DomainReputation {
  score: number;               // 信誉分 0-1
  category: 'authoritative' | 'reputable' | 'general' | 'suspicious' | 'blocked';
  description?: string;
}

// 评分器配置
export interface SignificanceScorerConfig {
  version: string;
  weights: SignificanceWeights;
  thresholds: {
    high: number;              // 高分阈值
    medium: number;            // 中分阈值
    low: number;               // 低分阈值
  };
  domainReputations: Record<string, DomainReputation>;
  timelinessConfig: {
    // 不同类型内容的时效性半衰期（小时）
    halfLifeHours: Record<string, number>;
    maxAgeHours: number;       // 最大有效时间（小时）
  };
  noveltyConfig: {
    minSimilarityThreshold: number;  // 最小相似度阈值
    tagOverlapPenalty: number;       // 标签重叠惩罚系数
  };
}
