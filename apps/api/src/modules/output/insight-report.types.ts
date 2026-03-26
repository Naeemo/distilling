// ============================================================
// 洞察报告服务类型定义 (Insight Report Service Types)
// 高价值信息产出：执行摘要 + 主体内容 + 深度探索
// ============================================================

import { CognitiveProfile } from './user-profile.types';

/**
 * 关键发现
 */
export interface KeyFinding {
  id: string;
  order: number;             // 排序顺序
  statement: string;         // 发现陈述
  evidence: string[];        // 支持证据
  significance: 'critical' | 'important' | 'notable'; // 重要性等级
  confidence: number;        // 置信度 0-1
  relatedThemes: string[];   // 相关主题
}

/**
 * 行动建议
 */
export interface ActionRecommendation {
  id: string;
  order: number;
  action: string;            // 建议行动
  rationale: string;         // 理由
  priority: 'immediate' | 'short_term' | 'long_term'; // 优先级
  effort: 'low' | 'medium' | 'high'; // 所需投入
  impact: 'low' | 'medium' | 'high'; // 预期影响
  relatedFindingIds: string[]; // 关联的发现ID
}

/**
 * 执行摘要
 */
export interface ExecutiveSummary {
  tlDr: string;              // 一句话 TL;DR
  keyFindings: KeyFinding[]; // 3-5个关键发现
  recommendations: ActionRecommendation[]; // 行动建议
}

/**
 * 主题分析
 */
export interface ThemeAnalysis {
  id: string;
  name: string;              // 主题名称
  description: string;       // 主题描述
  importance: number;        // 重要性 0-1
  coverage: number;          // 覆盖度（多少来源提到）
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'; // 情感倾向
  keyPoints: string[];       // 关键要点
  relatedThemes: string[];   // 相关主题
  sourceCount: number;       // 来源数量
  evidenceStrength: number;  // 证据强度 0-1
}

/**
 * 时间线事件
 */
export interface TimelineEvent {
  id: string;
  date: Date;
  dateDisplay: string;       // 格式化显示日期
  title: string;
  description: string;
  significance: 'milestone' | 'major' | 'minor';
  sourceIds: string[];       // 来源内容ID
  relatedEvents: string[];   // 相关事件ID
}

/**
 * 时间线
 */
export interface Timeline {
  title: string;
  description: string;
  events: TimelineEvent[];
  startDate: Date;
  endDate: Date;
  totalDuration: string;     // 总持续时间描述
}

/**
 * 对比维度
 */
export interface ComparisonDimension {
  name: string;              // 维度名称
  description: string;
  subjects: Record<string, { // 各个主体的评分/描述
    score?: number;
    description: string;
    evidence: string[];
  }>;
}

/**
 * 对比分析
 */
export interface ComparisonAnalysis {
  id: string;
  title: string;
  subjects: string[];        // 对比主体
  dimensions: ComparisonDimension[];
  conclusion: string;        // 对比结论
  recommendation?: string;   // 基于对比的建议
}

/**
 * 知识网络节点
 */
export interface NetworkNode {
  id: string;
  label: string;             // 节点标签
  type: 'theme' | 'entity' | 'claim' | 'source';
  size: number;              // 节点大小（重要性）
  color?: string;            // 节点颜色
  metadata?: Record<string, any>;
}

/**
 * 知识网络边
 */
export interface NetworkEdge {
  id: string;
  source: string;            // 源节点ID
  target: string;            // 目标节点ID
  type: 'supports' | 'contradicts' | 'relates' | 'derived_from';
  strength: number;          // 关联强度 0-1
  label?: string;
}

/**
 * 知识网络图
 */
export interface KnowledgeNetwork {
  title: string;
  description: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: {                // 聚类信息
    id: string;
    name: string;
    nodeIds: string[];
    color: string;
  }[];
  layout: 'force' | 'hierarchical' | 'circular';
}

/**
 * 值得追问的问题
 */
export interface FollowUpQuestion {
  id: string;
  question: string;          // 问题本身
  context: string;           // 为什么值得追问
  potentialValue: string;    // 回答可能带来的价值
  difficulty: 'easy' | 'medium' | 'hard'; // 回答难度
  suggestedApproach: string; // 建议的探究方法
  relatedFindingIds: string[];
}

/**
 * 未解决的争议
 */
export interface UnresolvedDebate {
  id: string;
  topic: string;             // 争议主题
  description: string;       // 争议描述
  positions: {
    side: string;
    argument: string;
    supporters: string[];
    evidence: string[];
  }[];
  whyUnresolved: string;     // 为何尚未解决
  potentialResolution: string; // 可能的解决路径
  significance: 'fundamental' | 'methodological' | 'interpretive';
}

/**
 * 趋势预测
 */
export interface TrendPrediction {
  id: string;
  trend: string;             // 趋势描述
  timeframe: 'near' | 'medium' | 'long'; // 时间框架
  confidence: number;        // 置信度 0-1
  supportingEvidence: string[];
  counterIndicators: string[]; // 反面指标
  implications: string[];    // 影响
  keyVariables: string[];    // 关键变量
}

/**
 * 深度探索
 */
export interface DeepDive {
  questions: FollowUpQuestion[];   // 值得追问的问题
  debates: UnresolvedDebate[];     // 未解决的争议
  predictions: TrendPrediction[];  // 趋势预测
}

/**
 * 洞察报告主体内容
 */
export interface ReportBody {
  themes: ThemeAnalysis[];           // 主题分析
  timeline?: Timeline;               // 时间线（可选）
  comparison?: ComparisonAnalysis;   // 对比分析（可选）
  network: KnowledgeNetwork;         // 知识网络图
}

/**
 * 报告元信息
 */
export interface ReportMeta {
  title: string;
  scope: string[];           // 覆盖主题
  sources: number;           // 来源数量
  generatedAt: Date;
  expiresAt?: Date;          // 时效性
  authorProfile?: string;    // 作者画像
  version: number;
}

/**
 * 完整洞察报告
 */
export interface InsightReport {
  id: string;
  userId: string;
  
  // 元信息
  meta: ReportMeta;
  
  // 执行摘要
  executive: ExecutiveSummary;
  
  // 主体内容
  body: ReportBody;
  
  // 深度探索
  deepDive: DeepDive;
  
  // 个性化配置
  personalization: {
    targetProfile: string;
    adaptationNotes: string[];
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * 报告生成选项
 */
export interface ReportGenerationOptions {
  // 执行摘要选项
  executive: {
    maxFindings: number;     // 最大发现数量
    maxRecommendations: number; // 最大建议数量
    minConfidence: number;   // 最小置信度
  };
  
  // 主体内容选项
  body: {
    maxThemes: number;       // 最大主题数
    includeTimeline: boolean; // 是否包含时间线
    includeComparison: boolean; // 是否包含对比分析
    networkDepth: 'surface' | 'medium' | 'deep'; // 网络图深度
  };
  
  // 深度探索选项
  deepDive: {
    maxQuestions: number;    // 最大追问数量
    maxDebates: number;      // 最大争议数量
    maxPredictions: number;  // 最大预测数量
    includeSpeculative: boolean; // 是否包含推测性内容
  };
  
  // 个性化
  personalization: {
    adaptToProfile: boolean;
    emphasizeFocusAreas: boolean;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * 报告生成输入
 */
export interface ReportGenerationInput {
  userId: string;
  contentIds: string[];      // 来源内容ID列表
  title?: string;            // 报告标题（可选，自动生成）
  scope?: string[];          // 限定主题范围
  options?: Partial<ReportGenerationOptions>;
  profile?: CognitiveProfile; // 用户认知画像
}

/**
 * 报告预览
 */
export interface ReportPreview {
  id: string;
  title: string;
  scope: string[];
  sourceCount: number;
  estimatedReadTime: number; // 预计阅读时间(分钟)
  keyThemeCount: number;
  hasTimeline: boolean;
  hasComparison: boolean;
  hasDeepDive: boolean;
  generatedAt: Date;
}

/**
 * 报告质量评估
 */
export interface ReportQuality {
  reportId: string;
  scores: {
    insightfulness: number;  // 洞察深度 0-1
    comprehensiveness: number; // 全面性 0-1
    coherence: number;       // 连贯性 0-1
    actionability: number;   // 可行动性 0-1
    originality: number;     // 原创性 0-1
  };
  coverage: {
    themesAnalyzed: number;
    sourcesUtilized: number;
    totalSources: number;
  };
  issues: string[];
  improvements: string[];
}

/**
 * 默认报告生成选项
 */
export const DEFAULT_REPORT_OPTIONS: ReportGenerationOptions = {
  executive: {
    maxFindings: 5,
    maxRecommendations: 5,
    minConfidence: 0.6,
  },
  body: {
    maxThemes: 7,
    includeTimeline: true,
    includeComparison: true,
    networkDepth: 'medium',
  },
  deepDive: {
    maxQuestions: 5,
    maxDebates: 3,
    maxPredictions: 3,
    includeSpeculative: false,
  },
  personalization: {
    adaptToProfile: true,
    emphasizeFocusAreas: true,
  },
};

/**
 * 报告模板
 */
export enum ReportTemplate {
  COMPREHENSIVE = 'comprehensive',  // 全面报告
  EXECUTIVE = 'executive',          // 执行摘要优先
  RESEARCH = 'research',            // 研究导向
  DECISION = 'decision',            // 决策支持
  TREND = 'trend',                  // 趋势分析
}

/**
 * 模板配置
 */
export const TEMPLATE_CONFIGS: Record<ReportTemplate, Partial<ReportGenerationOptions>> = {
  [ReportTemplate.COMPREHENSIVE]: {
    executive: { maxFindings: 5, maxRecommendations: 5, minConfidence: 0.6 },
    body: { maxThemes: 7, includeTimeline: true, includeComparison: true, networkDepth: 'medium' },
    deepDive: { maxQuestions: 5, maxDebates: 3, maxPredictions: 3, includeSpeculative: true },
  },
  [ReportTemplate.EXECUTIVE]: {
    executive: { maxFindings: 3, maxRecommendations: 3, minConfidence: 0.7 },
    body: { maxThemes: 5, includeTimeline: false, includeComparison: true, networkDepth: 'surface' },
    deepDive: { maxQuestions: 3, maxDebates: 2, maxPredictions: 2, includeSpeculative: false },
  },
  [ReportTemplate.RESEARCH]: {
    executive: { maxFindings: 5, maxRecommendations: 3, minConfidence: 0.5 },
    body: { maxThemes: 10, includeTimeline: true, includeComparison: true, networkDepth: 'deep' },
    deepDive: { maxQuestions: 8, maxDebates: 5, maxPredictions: 4, includeSpeculative: true },
  },
  [ReportTemplate.DECISION]: {
    executive: { maxFindings: 4, maxRecommendations: 6, minConfidence: 0.7 },
    body: { maxThemes: 6, includeTimeline: true, includeComparison: true, networkDepth: 'medium' },
    deepDive: { maxQuestions: 4, maxDebates: 4, maxPredictions: 3, includeSpeculative: false },
  },
  [ReportTemplate.TREND]: {
    executive: { maxFindings: 4, maxRecommendations: 4, minConfidence: 0.6 },
    body: { maxThemes: 6, includeTimeline: true, includeComparison: false, networkDepth: 'medium' },
    deepDive: { maxQuestions: 5, maxDebates: 3, maxPredictions: 6, includeSpeculative: true },
  },
};
