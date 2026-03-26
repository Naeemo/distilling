// ============================================================
// 用户认知画像类型定义
// ============================================================

/**
 * 领域知识水平
 */
export enum ExpertiseLevel {
  NOVICE = 'novice',           // 新手
  INTERMEDIATE = 'intermediate', // 进阶
  EXPERT = 'expert',           // 专家
}

/**
 * 深度偏好
 */
export enum DepthPreference {
  SURFACE = 'surface',     // 浅层 - 快速浏览
  BALANCED = 'balanced',   // 平衡 - 适中深度
  DEEP = 'deep',           // 深度 - 深入理解
}

/**
 * 阅读节奏
 */
export enum PacePreference {
  QUICK = 'quick',         // 快速 - 抓重点
  MODERATE = 'moderate',   // 适中 - 正常阅读
  THOROUGH = 'thorough',   // 仔细 - 精读
}

/**
 * 格式偏好
 */
export enum FormatPreference {
  TEXT = 'text',           // 文本优先
  VISUAL = 'visual',       // 可视化优先
  INTERACTIVE = 'interactive', // 交互式
}

/**
 * 知识结构偏好
 */
export enum StructurePreference {
  LINEAR = 'linear',         // 线性 - 循序渐进
  NETWORK = 'network',       // 网络 - 关联探索
  HIERARCHICAL = 'hierarchical', // 层级 - 体系化
}

/**
 * 精力状态
 */
export enum EnergyLevel {
  HIGH = 'high',     // 精力充沛
  MEDIUM = 'medium', // 正常
  LOW = 'low',       // 疲惫
}

/**
 * 用户目标
 */
export enum UserGoal {
  LEARN = 'learn',         // 学习新知识
  RESEARCH = 'research',   // 深入研究
  OVERVIEW = 'overview',   // 快速概览
  DECISION = 'decision',   // 决策支持
}

/**
 * 领域专业知识
 */
export interface DomainExpertise {
  domain: string;                          // 领域名称: tech/finance/science/...
  level: ExpertiseLevel;                   // 知识水平
  knownConcepts: string[];                 // 已掌握概念
  knowledgeGaps: string[];                 // 已知盲区
  confidenceScore: number;                 // 置信度 0-1
  lastAssessedAt: Date;                    // 最后评估时间
}

/**
 * 认知偏好
 */
export interface UserPreference {
  depth: DepthPreference;                  // 偏好深度
  pace: PacePreference;                    // 阅读节奏
  format: FormatPreference;                // 首选格式
  structure: StructurePreference;          // 知识结构偏好
  preferredDomains: string[];              // 偏好的领域
  dislikedDomains: string[];               // 不喜欢的领域
}

/**
 * 行为统计
 */
export interface UserBehavior {
  avgReadingTime: number;                  // 平均阅读时长（分钟）
  completionRate: number;                  // 完读率 0-1
  revisitedTopics: string[];               // 反复阅读的主题
  skippedTopics: string[];                 // 常跳过内容
  totalContentsRead: number;               // 总阅读内容数
  totalReadingTime: number;                // 累计阅读时长（分钟）
  favoriteTags: string[];                  // 最常阅读的标签
  peakReadingHours: number[];              // 活跃阅读时段（0-23）
  avgSessionDuration: number;              // 平均会话时长（分钟）
  interactionFrequency: number;            // 交互频率（每天）
}

/**
 * 当前上下文
 */
export interface UserContext {
  availableTime: number;                   // 可用时间（分钟）
  energyLevel: EnergyLevel;                // 精力状态
  goal: UserGoal;                          // 当前目标
  currentTopic?: string;                   // 当前关注主题
  recentSearches: string[];                // 最近搜索
  deviceType: 'mobile' | 'tablet' | 'desktop'; // 设备类型
}

/**
 * 完整用户认知画像
 */
export interface CognitiveProfile {
  userId: string;                          // 用户ID
  expertise: DomainExpertise[];            // 各领域专业知识
  preference: UserPreference;              // 认知偏好
  behavior: UserBehavior;                  // 历史行为
  context: UserContext;                    // 当前状态
  version: number;                         // 画像版本（用于追踪更新）
  createdAt: Date;                         // 创建时间
  updatedAt: Date;                         // 更新时间
}

/**
 * 用户行为事件（用于更新画像）
 */
export interface BehaviorEvent {
  userId: string;
  eventType: BehaviorEventType;
  timestamp: Date;
  contentId?: string;
  contentTags?: string[];
  metadata?: Record<string, any>;
}

/**
 * 行为事件类型
 */
export enum BehaviorEventType {
  CONTENT_READ = 'content_read',           // 阅读内容
  CONTENT_COMPLETE = 'content_complete',   // 完成阅读
  CONTENT_SKIP = 'content_skip',           // 跳过内容
  HIGHLIGHT_CREATE = 'highlight_create',   // 创建高亮
  NOTE_CREATE = 'note_create',             // 创建笔记
  SEARCH_QUERY = 'search_query',           // 搜索
  CONTENT_SHARE = 'content_share',         // 分享内容
  CONTENT_REVIEW = 'content_review',       // 复习内容
  TOPIC_EXPLORE = 'topic_explore',         // 探索主题
}

/**
 * 画像相似度结果
 */
export interface ProfileSimilarity {
  score: number;                           // 相似度分数 0-1
  commonDomains: string[];                 // 共同领域
  commonInterests: string[];               // 共同兴趣
  complementaryExpertise: string[];        // 互补专长
}

/**
 * 画像构建选项
 */
export interface ProfileBuildOptions {
  userId: string;
  lookbackDays?: number;                   // 回溯天数（默认30天）
  minEventCount?: number;                  // 最小事件数
}

/**
 * 画像更新选项
 */
export interface ProfileUpdateOptions {
  incremental?: boolean;                   // 是否增量更新
  forceRecalculate?: boolean;              // 强制重新计算
  weightRecentEvents?: number;             // 近期事件权重（1-2）
}
