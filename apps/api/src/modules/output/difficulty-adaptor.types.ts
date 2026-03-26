// ============================================================
// 难度自适应服务类型定义
// 基于认知负荷理论 (Cognitive Load Theory)
// ============================================================

import { CognitiveProfile, ExpertiseLevel, UserGoal, EnergyLevel } from './user-profile.types';

/**
 * 信息密度级别
 */
export enum InformationDensity {
  SPARSE = 'sparse',       // 稀疏 - 新手模式
  MODERATE = 'moderate',   // 适中 - 进阶模式
  DENSE = 'dense',         // 密集 - 专家模式
}

/**
 * 披露层级 (渐进披露)
 */
export enum DisclosureLevel {
  L1 = 'L1',  // 一眼可见 - 核心洞察
  L2 = 'L2',  // 点击/悬停展开 - 关键细节
  L3 = 'L3',  // 深入阅读 - 完整论证
  L4 = 'L4',  // 原始资料 - 溯源信息
}

/**
 * 内容复杂度评分
 */
export interface ComplexityScore {
  overall: number;           // 整体复杂度 0-1
  vocabulary: number;        // 词汇复杂度
  conceptual: number;        // 概念复杂度
  structural: number;        // 结构复杂度
  prerequisite: number;      // 前置知识要求
}

/**
 * 术语定义
 */
export interface TermDefinition {
  term: string;              // 术语原文
  definition: string;        // 定义解释
  context?: string;          // 上下文示例
  difficulty: 'basic' | 'intermediate' | 'advanced';
  relatedTerms?: string[];   // 相关术语
}

/**
 * 内容块
 */
export interface ContentChunk {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'formula' | 'visual';
  level: number;             // 层级深度
  content: string;           // 原始内容
  adaptedContent: string;    // 适配后内容
  complexity: ComplexityScore;
  terms: TermDefinition[];   // 包含的术语
  disclosureLevel: DisclosureLevel;
  estimatedReadTime: number; // 预计阅读时间(秒)
  prerequisites?: string[];  // 前置知识块ID
  children?: ContentChunk[]; // 子块(用于层级结构)
}

/**
 * 自适应内容包
 */
export interface AdaptedContent {
  // 元信息
  meta: {
    originalId: string;
    adaptedAt: Date;
    profileVersion: number;
    targetDensity: InformationDensity;
  };

  // 结构信息
  structure: {
    chunks: ContentChunk[];
    hierarchy: ChunkHierarchy;
    totalReadTime: number;     // 总预计阅读时间(秒)
    disclosureLevels: Record<DisclosureLevel, number>; // 各级别内容数量
  };

  // 适配结果
  adaptations: {
    density: InformationDensity;
    termsAdded: number;
    termsRemoved: number;
    chunksSplit: number;
    chunksMerged: number;
  };

  // 原始内容引用
  original: {
    title: string;
    summary: string;
    complexity: ComplexityScore;
  };
}

/**
 * 内容块层级结构
 */
export interface ChunkHierarchy {
  rootChunkIds: string[];
  levelDistribution: Record<number, number>;
  maxDepth: number;
}

/**
 * 难度适配选项
 */
export interface AdaptationOptions {
  // 密度调整
  density?: {
    target?: InformationDensity;
    autoAdjust?: boolean;      // 根据画像自动调整
  };

  // 术语处理
  terminology?: {
    explainUnknown?: boolean;  // 自动解释未知术语
    removeKnown?: boolean;     // 移除已知术语解释
    maxTermLevel?: 'basic' | 'intermediate' | 'advanced';
  };

  // 内容分块
  chunking?: {
    maxChunkSize?: number;     // 最大块大小(字符)
    minChunkSize?: number;     // 最小块大小
    preserveParagraphs?: boolean;
  };

  // 渐进披露
  disclosure?: {
    defaultLevel?: DisclosureLevel;
    enableProgressive?: boolean;
  };

  // 认知负荷优化
  cognitiveLoad?: {
    optimizeForEnergy?: boolean;
    respectTimeConstraint?: boolean;
    prioritizeKeyInfo?: boolean;
  };
}

/**
 * 认知负荷评估结果
 */
export interface CognitiveLoadAssessment {
  intrinsic: number;         // 内在负荷 (内容本身复杂度)
  extraneous: number;        // 外在负荷 (呈现方式复杂度)
  germane: number;           // 关联负荷 (有意义学习投入)
  total: number;             // 总负荷
  risk: 'low' | 'moderate' | 'high' | 'overload';
  recommendations: string[];
}

/**
 * 术语提取结果
 */
export interface TermExtraction {
  terms: TermDefinition[];
  unknownTerms: string[];    // 用户画像中未知的术语
  knownTerms: string[];      // 用户已知的术语
  domainTerms: TermDefinition[]; // 领域特定术语
}

/**
 * 适配反馈 (用于优化算法)
 */
export interface AdaptationFeedback {
  adaptedContentId: string;
  userId: string;
  ratings: {
    difficulty: number;      // 1-5 难度评分
    clarity: number;         // 1-5 清晰度评分
    usefulness: number;      // 1-5 有用性评分
  };
  behavior: {
    completionRate: number;  // 完读率
    timeSpent: number;       // 实际阅读时间
    interactions: number;    // 交互次数(展开、点击等)
    revisitedSections: string[];
  };
  comments?: string;
  submittedAt: Date;
}

/**
 * 难度适配结果预览
 */
export interface AdaptationPreview {
  originalComplexity: ComplexityScore;
  targetDensity: InformationDensity;
  estimatedReadTime: number;
  termCount: {
    total: number;
    toExplain: number;
    toRemove: number;
  };
  chunkCount: {
    total: number;
    byLevel: Record<DisclosureLevel, number>;
  };
  cognitiveLoad: CognitiveLoadAssessment;
}

/**
 * 默认适配选项
 */
export const DEFAULT_ADAPTATION_OPTIONS: AdaptationOptions = {
  density: {
    autoAdjust: true,
  },
  terminology: {
    explainUnknown: true,
    removeKnown: true,
    maxTermLevel: 'advanced',
  },
  chunking: {
    maxChunkSize: 500,
    minChunkSize: 100,
    preserveParagraphs: true,
  },
  disclosure: {
    defaultLevel: DisclosureLevel.L2,
    enableProgressive: true,
  },
  cognitiveLoad: {
    optimizeForEnergy: true,
    respectTimeConstraint: true,
    prioritizeKeyInfo: true,
  },
};

/**
 * 复杂度阈值
 */
export const COMPLEXITY_THRESHOLDS = {
  vocabulary: {
    simple: 0.3,
    moderate: 0.6,
    complex: 0.9,
  },
  conceptual: {
    simple: 0.3,
    moderate: 0.6,
    complex: 0.9,
  },
  overall: {
    low: 0.3,
    moderate: 0.6,
    high: 0.8,
  },
};

/**
 * 专家级别到信息密度的映射
 */
export const EXPERTISE_DENSITY_MAP: Record<ExpertiseLevel, InformationDensity> = {
  [ExpertiseLevel.NOVICE]: InformationDensity.SPARSE,
  [ExpertiseLevel.INTERMEDIATE]: InformationDensity.MODERATE,
  [ExpertiseLevel.EXPERT]: InformationDensity.DENSE,
};

/**
 * 目标到默认深度的映射
 * 使用字符串值而不是引用 user-profile.types 中的枚举
 */
export const GOAL_DEPTH_MAP: Record<UserGoal, string> = {
  [UserGoal.OVERVIEW]: 'surface',
  [UserGoal.LEARN]: 'balanced',
  [UserGoal.DECISION]: 'balanced',
  [UserGoal.RESEARCH]: 'deep',
};
