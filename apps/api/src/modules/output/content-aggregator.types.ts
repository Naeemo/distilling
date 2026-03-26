// ============================================================
// 内容聚合引擎类型定义
// ============================================================

/**
 * 内容输入单元
 */
export interface ContentInput {
  id: string;
  title: string;
  contentText: string;
  summary?: string;
  url?: string;
  sourceType: 'WEB' | 'RSS' | 'NEWSLETTER' | 'MANUAL';
  metadata?: {
    author?: string;
    publishDate?: string;
    siteName?: string;
    coverImage?: string;
  };
  createdAt: Date;
  // 可选的预计算洞察
  insights?: ContentInsight;
}

/**
 * 内容洞察 (来自 ContentInsight 模型)
 */
export interface ContentInsight {
  topics?: Array<{
    name: string;
    confidence: number;
  }>;
  keyEntities?: Array<{
    name: string;
    type: string;
    mentions: number;
  }>;
  sentiments?: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  stance?: 'supportive' | 'critical' | 'neutral' | 'exploratory';
  keyClaims?: string[];
  qualityScore?: number;
  credibilityScore?: number;
  temporalContext?: {
    eventTime?: string;
    referenceType?: string;
  };
}

/**
 * 主题聚类结果
 */
export interface ThemeCluster {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  contents: ClusteredContent[];
  summary?: string;
  centroid: number[]; // 向量中心点 (用于相似度计算)
  cohesion: number; // 聚类内聚度 0-1
}

/**
 * 聚类中的内容项
 */
export interface ClusteredContent {
  contentId: string;
  title: string;
  relevanceScore: number; // 与聚类的相关性 0-1
  excerpt: string; // 代表性片段
  keyPoints: string[]; // 该内容的关键点
}

/**
 * 观点对比
 */
export interface PerspectiveComparison {
  topic: string;
  perspectives: Perspective[];
  keyDifferences: DifferencePoint[];
  consensusAreas: string[];
  debateAreas: string[];
}

/**
 * 单一观点
 */
export interface Perspective {
  id: string;
  source: {
    contentId: string;
    title: string;
    author?: string;
    publication?: string;
    credibilityScore: number;
  };
  stance: 'supportive' | 'critical' | 'neutral' | 'exploratory';
  mainArgument: string;
  keyClaims: string[];
  evidence: Evidence[];
  confidence: number; // AI对观点提取的置信度
}

/**
 * 证据
 */
export interface Evidence {
  type: 'data' | 'expert_opinion' | 'case_study' | 'historical' | 'logical';
  content: string;
  weight: number; // 证据权重 0-1
  verifiable: boolean;
}

/**
 * 差异点
 */
export interface DifferencePoint {
  aspect: string; // 差异维度 (如 "因果关系", "解决方案")
  descriptions: Array<{
    perspectiveId: string;
    description: string;
  }>;
  significance: 'high' | 'medium' | 'low';
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id: string;
  contentId: string;
  title: string;
  eventDate: Date;
  datePrecision: 'exact' | 'month' | 'year' | 'approximate';
  description: string;
  significance: 'major' | 'minor' | 'background';
  relatedEvents: string[]; // 关联事件ID
  sourceContext: string; // 原文引用
}

/**
 * 时间线
 */
export interface EventTimeline {
  events: TimelineEvent[];
  phases: TimelinePhase[];
  span: {
    start: Date;
    end: Date;
  };
}

/**
 * 时间线阶段
 */
export interface TimelinePhase {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  events: string[]; // 事件ID列表
}

/**
 * 证据可信度评估
 */
export interface CredibilityAssessment {
  contentId: string;
  overallScore: number; // 0-1
  dimensions: {
    sourceAuthority: number; // 来源权威性
    factualConsistency: number; // 事实一致性
    evidenceSupport: number; // 证据支持度
    transparency: number; // 透明度 (引用、方法论)
    recency: number; // 时效性
  };
  redFlags: string[];
  strengths: string[];
  crossVerification: {
    verifiedClaims: number;
    disputedClaims: number;
    unverifiedClaims: number;
  };
}

/**
 * 聚合后的知识单元
 */
export interface AggregatedStory {
  id: string;
  userId: string;
  title: string;
  summary: string;
  
  // 核心组件
  themes: ThemeCluster[];
  perspectives?: PerspectiveComparison;
  timeline?: EventTimeline;
  credibilityMap: CredibilityAssessment[];
  
  // 元信息
  meta: {
    sourceCount: number;
    dateRange: {
      start: Date;
      end: Date;
    };
    coverageScore: number; // 覆盖完整度 0-1
    confidenceScore: number; // 整体置信度 0-1
    generatedAt: Date;
    version: number;
  };
  
  // 衍生数据
  knowledgeGraph?: {
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
  };
  readingPaths: ReadingPath[];
}

/**
 * 知识图谱节点
 */
export interface KnowledgeNode {
  id: string;
  type: 'concept' | 'entity' | 'event' | 'claim' | 'source';
  label: string;
  importance: number;
  description?: string;
}

/**
 * 知识图谱边
 */
export interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string;
  strength: number;
}

/**
 * 推荐阅读路径
 */
export interface ReadingPath {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 分钟
  steps: ReadingStep[];
}

/**
 * 阅读步骤
 */
export interface ReadingStep {
  order: number;
  type: 'overview' | 'theme' | 'perspective' | 'deep_dive' | 'source';
  targetId: string;
  title: string;
  purpose: string;
}

/**
 * 聚合选项
 */
export interface AggregationOptions {
  // 聚类配置
  clustering: {
    algorithm: 'kmeans' | 'hierarchical' | 'spectral';
    minClusterSize: number;
    maxClusters: number;
    similarityThreshold: number;
  };
  
  // 观点对比配置
  perspectiveAnalysis: {
    enabled: boolean;
    minSourcesForComparison: number;
    stanceDetection: boolean;
  };
  
  // 时间线配置
  timeline: {
    enabled: boolean;
    extractImplicitDates: boolean;
    minEventSignificance: 'major' | 'minor' | 'background';
  };
  
  // 可信度评估配置
  credibility: {
    enabled: boolean;
    crossReference: boolean;
    factCheck: boolean;
  };
}

/**
 * 聚合结果预览 (轻量级)
 */
export interface AggregationPreview {
  id: string;
  title: string;
  themeCount: number;
  sourceCount: number;
  hasPerspectives: boolean;
  hasTimeline: boolean;
  confidenceScore: number;
  generatedAt: Date;
}

/**
 * 默认聚合选项
 */
export const DEFAULT_AGGREGATION_OPTIONS: AggregationOptions = {
  clustering: {
    algorithm: 'hierarchical',
    minClusterSize: 2,
    maxClusters: 5,
    similarityThreshold: 0.6,
  },
  perspectiveAnalysis: {
    enabled: true,
    minSourcesForComparison: 2,
    stanceDetection: true,
  },
  timeline: {
    enabled: true,
    extractImplicitDates: true,
    minEventSignificance: 'background',
  },
  credibility: {
    enabled: true,
    crossReference: true,
    factCheck: false,
  },
};
