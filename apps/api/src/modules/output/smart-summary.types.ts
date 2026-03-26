// ============================================================
// 智能摘要服务类型定义 (Smart Summary Service Types)
// 三级摘要系统：30秒阅读 / 2分钟阅读 / 深度阅读
// ============================================================

import { AggregatedStory, ThemeCluster, PerspectiveComparison } from './content-aggregator.types';
import { CognitiveProfile } from './user-profile.types';

/**
 * 叙事结构类型
 */
export enum NarrativeStructure {
  PYRAMID = 'pyramid',      // 倒金字塔 - 最重要→次要→背景 (快速阅读)
  ARC = 'arc',              // 叙事弧线 - 背景→冲突→高潮→解决 (深度理解)
  QA = 'qa',                // 问答式 - 预测用户问题逐一解答 (问题导向)
  COMPARE = 'compare',      // 对比式 - A vs B 并排呈现 (决策支持)
  CHRONOLOGY = 'chronology', // 时间线 - 按时间顺序 (事件追踪)
}

/**
 * 摘要级别
 */
export enum SummaryLevel {
  INSIGHT = 'insight',      // 30秒阅读 - 核心洞察
  SUMMARY = 'summary',      // 2分钟阅读 - 扩展摘要
  NARRATIVE = 'narrative',  // 深度阅读 - 完整叙事
}

/**
 * 用户阅读偏好
 */
export interface ReadingPreference {
  preferredStructure: NarrativeStructure;
  preferredDepth: SummaryLevel;
  maxReadTime: number;       // 最大阅读时间(分钟)
  focusAreas: string[];      // 关注领域
  excludePerspectives: boolean; // 是否排除争议观点
}

/**
 * 30秒阅读 - 核心洞察层
 */
export interface InsightLevel {
  headline: string;          // 一句话 headline (必须抓人且准确)
  keyPoint: string;          // 核心观点 (信息的核心)
  implication: string;       // 对用户的影响 (为什么重要)
  readTime: number;          // 预计阅读时间(秒)
}

/**
 * 2分钟阅读 - 扩展摘要层
 */
export interface SummaryLevelContent {
  context: string;           // 为什么重要 (背景)
  development: string;       // 关键发展 (发生了什么)
  perspectives: PerspectiveSummary[]; // 不同视角
  keyTakeaways: string[];    // 关键要点
  readTime: number;          // 预计阅读时间(秒)
}

/**
 * 视角摘要
 */
export interface PerspectiveSummary {
  stance: 'supportive' | 'critical' | 'neutral' | 'exploratory';
  source: string;            // 来源简述
  mainPoint: string;         // 主要观点
  evidenceStrength: 'strong' | 'moderate' | 'weak';
}

/**
 * 深度阅读 - 叙事层
 */
export interface NarrativeLevel {
  structure: NarrativeStructure;
  sections: NarrativeSection[];
  references: Reference[];
  estimatedReadTime: number; // 预计阅读时间(分钟)
}

/**
 * 叙事段落
 */
export interface NarrativeSection {
  order: number;
  type: 'hook' | 'context' | 'conflict' | 'climax' | 'resolution' | 
        'background' | 'development' | 'analysis' | 'conclusion' |
        'question' | 'answer' | 'comparison_a' | 'comparison_b' | 'synthesis';
  title: string;
  content: string;
  keyQuotes?: string[];      // 关键引用
  highlights?: string[];     // 高亮内容
}

/**
 * 参考来源
 */
export interface Reference {
  id: string;
  contentId: string;
  title: string;
  author?: string;
  publication?: string;
  url?: string;
  credibilityScore: number;
  relevanceScore: number;
}

/**
 * 完整智能摘要
 */
export interface SmartSummary {
  id: string;
  userId: string;
  aggregatedStoryId: string;
  
  // 三级摘要
  insight: InsightLevel;                    // 30秒阅读
  summary: SummaryLevelContent;             // 2分钟阅读
  narrative: NarrativeLevel;                // 深度阅读
  
  // 元信息
  meta: {
    generatedAt: Date;
    version: number;
    sourceCount: number;
    themeCount: number;
    totalReadTime: {
      insight: number;      // 秒
      summary: number;      // 秒
      narrative: number;    // 分钟
    };
  };
  
  // 个性化配置
  personalization: {
    targetProfile: string;    // 目标用户画像ID
    adaptationNotes: string[]; // 适配说明
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  };
}

/**
 * 摘要生成选项
 */
export interface SummaryOptions {
  // 级别控制
  levels: {
    insight: boolean;        // 生成核心洞察
    summary: boolean;        // 生成扩展摘要
    narrative: boolean;      // 生成完整叙事
  };
  
  // 叙事结构偏好 (默认自动选择)
  preferredStructure?: NarrativeStructure;
  
  // 自动选择策略
  autoStructure: {
    enabled: boolean;
    basedOn: ('contentType' | 'userGoal' | 'complexity')[];
  };
  
  // 内容控制
  content: {
    maxInsightLength: number;     // 核心洞察最大长度(字)
    maxSummaryLength: number;     // 扩展摘要最大长度(字)
    maxSectionCount: number;      // 叙事段落最大数量
    includeQuotes: boolean;       // 包含引用
    includePerspectives: boolean; // 包含多视角
  };
  
  // 个性化
  personalization: {
    adaptToProfile: boolean;      // 根据用户画像调整
    respectTimeConstraint: boolean; // 尊重时间限制
    emphasizeFocusAreas: boolean;   // 强调关注领域
  };
}

/**
 * 摘要生成预览
 */
export interface SummaryPreview {
  id: string;
  title: string;
  availableLevels: SummaryLevel[];
  recommendedLevel: SummaryLevel;
  estimatedReadTimes: {
    insight: number;       // 秒
    summary: number;       // 秒
    narrative: number;     // 分钟
  };
  structureRecommendation: NarrativeStructure;
  keyThemes: string[];
  hasMultiplePerspectives: boolean;
  generatedAt: Date;
}

/**
 * 摘要质量评估
 */
export interface SummaryQuality {
  summaryId: string;
  scores: {
    completeness: number;      // 完整性 0-1
    accuracy: number;          // 准确性 0-1
    coherence: number;         // 连贯性 0-1
    conciseness: number;       // 简洁性 0-1
    engagement: number;        // 吸引力 0-1
  };
  coverage: {
    themesCovered: number;     // 覆盖的主题数
    themesTotal: number;       // 总主题数
    perspectivesCovered: number; // 覆盖的视角数
    perspectivesTotal: number;   // 总视角数
  };
  issues: string[];            // 存在的问题
  improvements: string[];      // 改进建议
}

/**
 * 用户反馈
 */
export interface SummaryFeedback {
  summaryId: string;
  userId: string;
  ratings: {
    relevance: number;         // 1-5 相关度
    clarity: number;           // 1-5 清晰度
    depth: number;             // 1-5 深度
    usefulness: number;        // 1-5 有用性
  };
  levelRead: SummaryLevel;     // 用户阅读了哪个级别
  timeSpent: number;           // 实际阅读时间(秒)
  completed: boolean;          // 是否完成阅读
  feedback?: string;           // 文字反馈
  submittedAt: Date;
}

/**
 * 默认摘要选项
 */
export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  levels: {
    insight: true,
    summary: true,
    narrative: true,
  },
  autoStructure: {
    enabled: true,
    basedOn: ['contentType', 'userGoal', 'complexity'],
  },
  content: {
    maxInsightLength: 200,
    maxSummaryLength: 800,
    maxSectionCount: 8,
    includeQuotes: true,
    includePerspectives: true,
  },
  personalization: {
    adaptToProfile: true,
    respectTimeConstraint: true,
    emphasizeFocusAreas: true,
  },
};

/**
 * 结构选择策略
 */
export const STRUCTURE_SELECTION_STRATEGY = {
  // 基于内容类型的推荐
  contentType: {
    breaking_news: NarrativeStructure.PYRAMID,
    analysis: NarrativeStructure.ARC,
    tutorial: NarrativeStructure.QA,
    comparison: NarrativeStructure.COMPARE,
    history: NarrativeStructure.CHRONOLOGY,
  },
  
  // 基于用户目标的推荐
  userGoal: {
    overview: NarrativeStructure.PYRAMID,
    learn: NarrativeStructure.ARC,
    decision: NarrativeStructure.COMPARE,
    research: NarrativeStructure.QA,
  },
  
  // 基于复杂度的推荐
  complexity: {
    low: NarrativeStructure.PYRAMID,
    medium: NarrativeStructure.ARC,
    high: NarrativeStructure.QA,
  },
};

/**
 * 阅读时间参考
 */
export const READ_TIME_REFERENCE = {
  insight: {
    target: 30,        // 目标30秒
    min: 15,
    max: 60,
  },
  summary: {
    target: 120,       // 目标2分钟
    min: 60,
    max: 300,
  },
  narrative: {
    target: 10,        // 目标10分钟
    min: 5,
    max: 30,
  },
};
