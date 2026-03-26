// ============================================================
// 知识卡片服务类型定义 (Knowledge Card Service Types)
// 将概念封装为可学习、可连接、可追踪的知识单元
// ============================================================

import { CognitiveProfile } from './user-profile.types';

/**
 * 掌握程度等级
 */
export enum MasteryLevel {
  EXPOSED = 'exposed',       // 暴露 - 首次接触，有印象
  FAMILIAR = 'familiar',     // 熟悉 - 理解概念，能解释
  MASTERED = 'mastered',     // 掌握 - 熟练应用，能教授
}

/**
 * 概念引用 - 用于连接其他知识
 */
export interface ConceptReference {
  id: string;
  term: string;               // 术语名称
  definition: string;         // 简短定义
  cardId?: string;            // 关联的知识卡片ID
  relevanceScore: number;     // 相关度 0-1
  relationType: 'isA' | 'partOf' | 'relatedTo' | 'leadsTo' | 'contrastsWith';
}

/**
 * 视觉辅助 - 图解说明
 */
export interface VisualAid {
  type: 'diagram' | 'chart' | 'mindmap' | 'illustration' | 'formula';
  title: string;
  description: string;
  svg?: string;               // SVG 图形数据
  mermaid?: string;           // Mermaid 图表代码
  altText: string;            // 无障碍文本
}

/**
 * 实际应用案例
 */
export interface ApplicationExample {
  id: string;
  title: string;
  description: string;        // 应用场景描述
  domain: string;             // 应用领域
  complexity: 'simple' | 'moderate' | 'complex';
  outcome?: string;           // 应用结果/效果
  prerequisites: string[];    // 应用前需要了解的概念
}

/**
 * 争议观点
 */
export interface DebateView {
  id: string;
  viewpoint: string;          // 观点陈述
  proponents: string[];       // 支持者
  supportingEvidence: string[];
  counterArguments: string[]; // 反驳意见
  significance: 'fundamental' | 'methodological' | 'interpretive';
}

/**
 * 概念定义层
 */
export interface ConceptDefinition {
  term: string;               // 术语名称
  definition: string;         // 定义
  shortDefinition: string;    // 一句话定义（用于快速理解）
  analogy?: string;           // 类比解释（用已知解释未知）
  analogyExplanation?: string; // 类比详解
  visual?: VisualAid;         // 图解
  origin?: string;            // 概念来源
  etymology?: string;         // 词源
}

/**
 * 相关连接层
 */
export interface KnowledgeConnections {
  prerequisites: ConceptReference[];  // 前置知识（学习此概念前需要掌握的）
  extensions: ConceptReference[];     // 延伸阅读（可以深入学习的）
  applications: ApplicationExample[]; // 实际应用
  debates: DebateView[];              // 争议观点
  relatedCards: string[];             // 相关知识卡片ID列表
}

/**
 * 学习进度追踪
 */
export interface MasteryProgress {
  level: MasteryLevel;        // 当前掌握等级
  reviewCount: number;        // 复习次数
  lastReview: Date;           // 最后复习时间
  nextReview?: Date;          // 下次建议复习时间
  confidence: number;         // 自信度 0-1
  exposureCount: number;      // 接触次数
  firstExposure: Date;        // 首次接触时间
  
  // 学习统计
  stats: {
    avgReviewInterval: number;     // 平均复习间隔(天)
    forgettingCurve: number[];     // 遗忘曲线数据点
    difficultyRating?: number;     // 难度自评 1-5
    learningTimeSpent: number;     // 学习耗时(分钟)
  };
}

/**
 * 学习计划
 */
export interface LearningPlan {
  stages: {
    stage: MasteryLevel;
    objectives: string[];
    estimatedTime: number;      // 预计学习时间(分钟)
    resources: string[];
  }[];
  recommendedPath: string[];    // 推荐学习路径(概念ID列表)
}

/**
 * 完整知识卡片
 */
export interface KnowledgeCard {
  id: string;
  userId: string;
  
  // 概念定义
  concept: ConceptDefinition;
  
  // 相关连接
  connections: KnowledgeConnections;
  
  // 掌握进度
  mastery: MasteryProgress;
  
  // 学习计划
  learningPlan?: LearningPlan;
  
  // 元信息
  meta: {
    domain: string;             // 所属领域
    tags: string[];             // 标签
    createdAt: Date;
    updatedAt: Date;
    version: number;
    sourceContentIds: string[]; // 来源内容ID
    generatedBy: 'ai' | 'user' | 'imported';
  };
  
  // 个性化配置
  personalization: {
    difficultyAdjusted: boolean;
    analogyCustomized: boolean;
    prerequisiteFiltered: boolean;
    notes?: string;             // 用户笔记
  };
}

/**
 * 卡片生成选项
 */
export interface CardGenerationOptions {
  // 概念提取控制
  extraction: {
    maxConcepts: number;        // 最大概念数
    minSignificance: number;    // 最小显著性阈值 0-1
    includeNested: boolean;     // 是否包含嵌套概念
  };
  
  // 类比生成
  analogy: {
    enabled: boolean;
    domainPreference?: string;  // 偏好类比领域
    complexity: 'simple' | 'moderate' | 'detailed';
  };
  
  // 视觉生成
  visual: {
    enabled: boolean;
    preferredType?: VisualAid['type'];
    autoGenerate: boolean;
  };
  
  // 连接发现
  connections: {
    maxPrerequisites: number;
    maxExtensions: number;
    maxApplications: number;
    includeDebates: boolean;
    autoDiscover: boolean;
  };
  
  // 个性化
  personalization: {
    adaptToProfile: boolean;
    respectKnownConcepts: boolean;
    filterByDomain: boolean;
  };
}

/**
 * 卡片更新输入
 */
export interface CardUpdateInput {
  concept?: Partial<ConceptDefinition>;
  connections?: Partial<KnowledgeConnections>;
  mastery?: Partial<MasteryProgress>;
  notes?: string;
}

/**
 * 复习会话
 */
export interface ReviewSession {
  id: string;
  userId: string;
  cardId: string;
  startedAt: Date;
  completedAt?: Date;
  
  // 复习内容
  prompts: {
    type: 'recall' | 'explain' | 'apply' | 'connect';
    question: string;
    expectedAnswer?: string;
    userAnswer?: string;
  }[];
  
  // 复习结果
  results: {
    score: number;              // 0-1
    confidenceDelta: number;    // 自信度变化
    levelChanged: boolean;      // 等级是否提升
    newLevel?: MasteryLevel;
    timeSpent: number;          // 耗时(秒)
  };
  
  // 反馈
  feedback?: {
    difficulty: 'too_easy' | 'just_right' | 'too_hard';
    comments?: string;
  };
}

/**
 * 学习推荐
 */
export interface LearningRecommendation {
  type: 'new_card' | 'review' | 'connect' | 'deepen';
  cardId?: string;
  concept?: ConceptReference;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  prerequisiteCards?: string[];
}

/**
 * 卡片搜索过滤
 */
export interface CardFilter {
  domain?: string;
  masteryLevel?: MasteryLevel;
  tags?: string[];
  dueForReview?: boolean;
  searchQuery?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

/**
 * 卡片统计
 */
export interface CardStatistics {
  userId: string;
  totalCards: number;
  byMastery: Record<MasteryLevel, number>;
  byDomain: Record<string, number>;
  reviewStats: {
    dueToday: number;
    overdue: number;
    completedToday: number;
    streakDays: number;
  };
  learningVelocity: {
    cardsPerDay: number;
    avgConfidenceGrowth: number;
  };
}

/**
 * 默认卡片生成选项
 */
export const DEFAULT_CARD_OPTIONS: CardGenerationOptions = {
  extraction: {
    maxConcepts: 10,
    minSignificance: 0.6,
    includeNested: true,
  },
  analogy: {
    enabled: true,
    complexity: 'moderate',
  },
  visual: {
    enabled: true,
    autoGenerate: false,
  },
  connections: {
    maxPrerequisites: 5,
    maxExtensions: 5,
    maxApplications: 3,
    includeDebates: true,
    autoDiscover: true,
  },
  personalization: {
    adaptToProfile: true,
    respectKnownConcepts: true,
    filterByDomain: true,
  },
};

/**
 * 掌握等级定义
 */
export const MASTERY_LEVEL_DEFINITIONS: Record<MasteryLevel, {
  label: string;
  description: string;
  criteria: string[];
  minConfidence: number;
}> = {
  [MasteryLevel.EXPOSED]: {
    label: '已暴露',
    description: '听说过这个概念，有模糊印象',
    criteria: ['能认出术语', '知道大致领域', '无法详细解释'],
    minConfidence: 0,
  },
  [MasteryLevel.FAMILIAR]: {
    label: '已熟悉',
    description: '理解概念含义，能用自己的话解释',
    criteria: ['能用自己的话解释', '知道应用场景', '能举出例子'],
    minConfidence: 0.5,
  },
  [MasteryLevel.MASTERED]: {
    label: '已掌握',
    description: '熟练应用，能教授他人',
    criteria: ['能教授他人', '能分析边界情况', '能与其他概念建立联系'],
    minConfidence: 0.85,
  },
};

/**
 * 复习间隔策略 (基于间隔重复算法)
 */
export const REVIEW_INTERVAL_STRATEGY = {
  [MasteryLevel.EXPOSED]: {
    initialInterval: 1,       // 1天后首次复习
    multiplier: 1.5,
    maxInterval: 7,
  },
  [MasteryLevel.FAMILIAR]: {
    initialInterval: 3,       // 3天后
    multiplier: 2,
    maxInterval: 30,
  },
  [MasteryLevel.MASTERED]: {
    initialInterval: 7,       // 7天后
    multiplier: 2.5,
    maxInterval: 180,
  },
};
