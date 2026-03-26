import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import {
  CognitiveProfile,
  DomainExpertise,
  UserPreference,
  UserBehavior,
  UserContext,
  BehaviorEvent,
  BehaviorEventType,
  ProfileSimilarity,
  ProfileBuildOptions,
  ProfileUpdateOptions,
  ExpertiseLevel,
  DepthPreference,
  PacePreference,
  FormatPreference,
  StructurePreference,
  EnergyLevel,
  UserGoal,
} from './user-profile.types';

/**
 * 用户认知画像服务
 * 
 * 核心功能：
 * 1. 从用户行为数据构建画像
 * 2. 画像更新机制
 * 3. 画像相似度计算
 */
@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);
  private readonly CACHE_PREFIX = 'user:profile:';
  private readonly CACHE_TTL = 3600; // 1小时

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  // ============================================================
  // 核心API：获取/构建画像
  // ============================================================

  /**
   * 获取用户认知画像（优先从缓存获取）
   */
  async getProfile(userId: string): Promise<CognitiveProfile | null> {
    // 尝试从缓存获取
    const cached = await this.getCachedProfile(userId);
    if (cached) {
      this.logger.debug(`Profile cache hit for user ${userId}`);
      return cached;
    }

    // 从数据库构建
    const profile = await this.buildProfile({ userId });
    
    // 缓存画像
    await this.cacheProfile(userId, profile);
    
    return profile;
  }

  /**
   * 从用户行为数据构建完整画像
   */
  async buildProfile(options: ProfileBuildOptions): Promise<CognitiveProfile> {
    const { userId, lookbackDays = 30 } = options;
    
    this.logger.log(`Building profile for user ${userId} (last ${lookbackDays} days)`);

    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // 并行获取各类数据
    const [
      contents,
      highlights,
      tags,
      readingStats,
    ] = await Promise.all([
      this.fetchUserContents(userId, since),
      this.fetchUserHighlights(userId, since),
      this.fetchUserTags(userId),
      this.calculateReadingStats(userId, since),
    ]);

    // 构建各领域专业知识
    const expertise = await this.buildExpertise(userId, contents, tags);

    // 构建用户偏好
    const preference = this.buildPreference(contents, tags, readingStats);

    // 构建行为统计
    const behavior = this.buildBehavior(contents, readingStats, highlights);

    // 构建当前上下文（基于最近行为）
    const context = await this.buildContext(userId);

    const profile: CognitiveProfile = {
      userId,
      expertise,
      preference,
      behavior,
      context,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 保存到数据库
    await this.saveProfile(userId, profile);

    return profile;
  }

  /**
   * 更新用户画像
   */
  async updateProfile(
    userId: string,
    event: BehaviorEvent,
    options: ProfileUpdateOptions = {},
  ): Promise<CognitiveProfile> {
    const { incremental = true, weightRecentEvents = 1.2 } = options;

    let profile = await this.getProfile(userId);
    
    // 如果没有画像，先构建一个
    if (!profile) {
      profile = await this.buildProfile({ userId });
    }

    // 应用行为事件更新画像
    await this.applyBehaviorEvent(profile, event, weightRecentEvents);

    // 更新版本和时间戳
    profile.version += 1;
    profile.updatedAt = new Date();

    // 保存并刷新缓存
    await this.saveProfile(userId, profile);
    await this.cacheProfile(userId, profile);

    this.logger.debug(`Profile updated for user ${userId}, version ${profile.version}`);

    return profile;
  }

  // ============================================================
  // 画像相似度计算
  // ============================================================

  /**
   * 计算两个用户画像的相似度
   */
  calculateSimilarity(profileA: CognitiveProfile, profileB: CognitiveProfile): ProfileSimilarity {
    // 领域相似度
    const domainScore = this.calculateDomainSimilarity(profileA.expertise, profileB.expertise);

    // 偏好相似度
    const preferenceScore = this.calculatePreferenceSimilarity(profileA.preference, profileB.preference);

    // 行为相似度
    const behaviorScore = this.calculateBehaviorSimilarity(profileA.behavior, profileB.behavior);

    // 综合相似度（加权平均）
    const weights = { domain: 0.4, preference: 0.35, behavior: 0.25 };
    const score = 
      domainScore * weights.domain +
      preferenceScore * weights.preference +
      behaviorScore * weights.behavior;

    // 找出共同点和互补点
    const commonDomains = this.findCommonDomains(profileA.expertise, profileB.expertise);
    const commonInterests = this.findCommonInterests(profileA.behavior, profileB.behavior);
    const complementaryExpertise = this.findComplementaryExpertise(profileA.expertise, profileB.expertise);

    return {
      score: Math.round(score * 100) / 100,
      commonDomains,
      commonInterests,
      complementaryExpertise,
    };
  }

  /**
   * 批量查找相似用户
   */
  async findSimilarUsers(userId: string, limit: number = 10): Promise<Array<{ userId: string; similarity: ProfileSimilarity }>> {
    const userProfile = await this.getProfile(userId);
    if (!userProfile) {
      return [];
    }

    // 获取所有用户的画像（实际应用中应该分页或采样）
    const allProfiles = await this.getAllProfiles();

    const similarities = allProfiles
      .filter(p => p.userId !== userId)
      .map(p => ({
        userId: p.userId,
        similarity: this.calculateSimilarity(userProfile, p),
      }))
      .sort((a, b) => b.similarity.score - a.similarity.score)
      .slice(0, limit);

    return similarities;
  }

  // ============================================================
  // 内部辅助方法：数据获取
  // ============================================================

  private async fetchUserContents(userId: string, since: Date) {
    return this.prisma.content.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      include: {
        tags: {
          include: { tag: true },
        },
        insights: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async fetchUserHighlights(userId: string, since: Date) {
    return this.prisma.highlight.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
    });
  }

  private async fetchUserTags(userId: string) {
    return this.prisma.tag.findMany({
      where: { userId },
      include: {
        contents: {
          select: { contentId: true },
        },
      },
    });
  }

  private async calculateReadingStats(userId: string, since: Date) {
    const contents = await this.prisma.content.findMany({
      where: {
        userId,
        OR: [
          { status: 'READ' },
          { status: 'READING' },
        ],
        lastReadAt: { gte: since },
      },
      select: {
        readingProgress: true,
        readingTime: true,
        status: true,
        lastReadAt: true,
      },
    });

    const totalContents = contents.length;
    const completedContents = contents.filter(c => c.status === 'READ').length;
    const totalReadingTime = contents.reduce((sum, c) => sum + c.readingTime, 0);

    // 计算活跃时段
    const hourDistribution = new Array(24).fill(0);
    contents.forEach(c => {
      if (c.lastReadAt) {
        const hour = new Date(c.lastReadAt).getHours();
        hourDistribution[hour]++;
      }
    });
    const peakHours = hourDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    return {
      totalContents,
      completedContents,
      completionRate: totalContents > 0 ? completedContents / totalContents : 0,
      totalReadingTime,
      avgReadingTime: totalContents > 0 ? totalReadingTime / totalContents / 60 : 0,
      peakHours,
    };
  }

  // ============================================================
  // 内部辅助方法：画像构建
  // ============================================================

  private async buildExpertise(
    userId: string,
    contents: any[],
    tags: any[],
  ): Promise<DomainExpertise[]> {
    // 按标签分组统计
    const tagStats = new Map<string, { count: number; totalProgress: number }>();
    
    contents.forEach(content => {
      content.tags.forEach((ct: any) => {
        const tagName = ct.tag.name;
        const existing = tagStats.get(tagName) || { count: 0, totalProgress: 0 };
        existing.count += 1;
        existing.totalProgress += content.readingProgress || 0;
        tagStats.set(tagName, existing);
      });
    });

    // 转换为领域专业知识
    const expertise: DomainExpertise[] = [];
    
    tagStats.forEach((stats, domain) => {
      const avgProgress = stats.totalProgress / stats.count;
      
      // 根据阅读数量和完成度判断水平
      let level: ExpertiseLevel;
      if (stats.count >= 20 && avgProgress >= 80) {
        level = ExpertiseLevel.EXPERT;
      } else if (stats.count >= 5 && avgProgress >= 50) {
        level = ExpertiseLevel.INTERMEDIATE;
      } else {
        level = ExpertiseLevel.NOVICE;
      }

      expertise.push({
        domain,
        level,
        knownConcepts: [], // 可以从内容insights中提取
        knowledgeGaps: [], // 可以基于搜索历史推断
        confidenceScore: Math.min(1, stats.count / 20),
        lastAssessedAt: new Date(),
      });
    });

    // 按阅读数量排序
    return expertise.sort((a, b) => {
      const countA = tagStats.get(a.domain)?.count || 0;
      const countB = tagStats.get(b.domain)?.count || 0;
      return countB - countA;
    });
  }

  private buildPreference(
    contents: any[],
    tags: any[],
    readingStats: any,
  ): UserPreference {
    // 基于阅读行为推断偏好
    const totalContents = contents.length;
    const avgProgress = totalContents > 0
      ? contents.reduce((sum, c) => sum + (c.readingProgress || 0), 0) / totalContents
      : 0;

    // 深度偏好：基于完读率
    let depth: DepthPreference;
    if (avgProgress >= 80) {
      depth = DepthPreference.DEEP;
    } else if (avgProgress >= 50) {
      depth = DepthPreference.BALANCED;
    } else {
      depth = DepthPreference.SURFACE;
    }

    // 节奏偏好：基于平均阅读时长
    let pace: PacePreference;
    if (readingStats.avgReadingTime < 3) {
      pace = PacePreference.QUICK;
    } else if (readingStats.avgReadingTime > 10) {
      pace = PacePreference.THOROUGH;
    } else {
      pace = PacePreference.MODERATE;
    }

    // 格式偏好：默认文本，可以从交互数据推断
    const format = FormatPreference.TEXT;

    // 结构偏好：基于标签使用模式
    const structure = tags.length > 10
      ? StructurePreference.HIERARCHICAL
      : StructurePreference.LINEAR;

    // 偏好的领域（阅读量前5）
    const preferredDomains = tags
      .sort((a, b) => b.contents.length - a.contents.length)
      .slice(0, 5)
      .map(t => t.name);

    return {
      depth,
      pace,
      format,
      structure,
      preferredDomains,
      dislikedDomains: [], // 可以从跳过内容推断
    };
  }

  private buildBehavior(
    contents: any[],
    readingStats: any,
    highlights: any[],
  ): UserBehavior {
    // 反复阅读的主题（有重复阅读的内容）
    const revisitedTopics = contents
      .filter(c => c.readCount > 1)
      .flatMap(c => c.tags.map((t: any) => t.tag.name))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    // 跳过的主题（进度低的内容）
    const skippedTopics = contents
      .filter(c => (c.readingProgress || 0) < 20)
      .flatMap(c => c.tags.map((t: any) => t.tag.name))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);

    // 最常阅读的标签
    const tagCounts = new Map<string, number>();
    contents.forEach(c => {
      c.tags.forEach((t: any) => {
        const name = t.tag.name;
        tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
      });
    });
    const favoriteTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return {
      avgReadingTime: readingStats.avgReadingTime,
      completionRate: readingStats.completionRate,
      revisitedTopics,
      skippedTopics,
      totalContentsRead: readingStats.totalContents,
      totalReadingTime: readingStats.totalReadingTime / 60, // 转换为分钟
      favoriteTags,
      peakReadingHours: readingStats.peakHours,
      avgSessionDuration: readingStats.avgReadingTime * 1.5, // 估算
      interactionFrequency: highlights.length / 30, // 每天平均
    };
  }

  private async buildContext(userId: string): Promise<UserContext> {
    // 获取最近的阅读行为
    const recentContent = await this.prisma.content.findFirst({
      where: { userId },
      orderBy: { lastReadAt: 'desc' },
      include: { tags: { include: { tag: true } } },
    });

    // 获取最近的搜索
    // 注意：需要从搜索日志获取，这里简化处理
    const recentSearches: string[] = [];

    return {
      availableTime: 30, // 默认值，可以从日程或历史推断
      energyLevel: EnergyLevel.MEDIUM,
      goal: UserGoal.LEARN,
      currentTopic: recentContent?.tags[0]?.tag.name,
      recentSearches,
      deviceType: 'desktop',
    };
  }

  // ============================================================
  // 内部辅助方法：画像更新
  // ============================================================

  private async applyBehaviorEvent(
    profile: CognitiveProfile,
    event: BehaviorEvent,
    weightRecentEvents: number,
  ): Promise<void> {
    switch (event.eventType) {
      case BehaviorEventType.CONTENT_READ:
        this.updateFromContentRead(profile, event, weightRecentEvents);
        break;
      case BehaviorEventType.CONTENT_COMPLETE:
        this.updateFromContentComplete(profile, event, weightRecentEvents);
        break;
      case BehaviorEventType.CONTENT_SKIP:
        this.updateFromContentSkip(profile, event);
        break;
      case BehaviorEventType.HIGHLIGHT_CREATE:
        this.updateFromHighlight(profile, event);
        break;
      case BehaviorEventType.SEARCH_QUERY:
        this.updateFromSearch(profile, event);
        break;
      case BehaviorEventType.TOPIC_EXPLORE:
        this.updateFromTopicExplore(profile, event);
        break;
    }
  }

  private updateFromContentRead(
    profile: CognitiveProfile,
    event: BehaviorEvent,
    weight: number,
  ): void {
    const tags = event.contentTags || [];
    
    // 更新领域统计
    tags.forEach(tag => {
      const existing = profile.expertise.find(e => e.domain === tag);
      if (existing) {
        existing.confidenceScore = Math.min(1, existing.confidenceScore + 0.05 * weight);
        existing.lastAssessedAt = new Date();
      } else {
        profile.expertise.push({
          domain: tag,
          level: ExpertiseLevel.NOVICE,
          knownConcepts: [],
          knowledgeGaps: [],
          confidenceScore: 0.1 * weight,
          lastAssessedAt: new Date(),
        });
      }
    });

    // 更新行为统计
    profile.behavior.totalContentsRead += 1;
  }

  private updateFromContentComplete(
    profile: CognitiveProfile,
    event: BehaviorEvent,
    weight: number,
  ): void {
    const tags = event.contentTags || [];
    
    tags.forEach(tag => {
      const expertise = profile.expertise.find(e => e.domain === tag);
      if (expertise) {
        // 提升水平和置信度
        if (expertise.confidenceScore > 0.5 && expertise.level === ExpertiseLevel.NOVICE) {
          expertise.level = ExpertiseLevel.INTERMEDIATE;
        } else if (expertise.confidenceScore > 0.8 && expertise.level === ExpertiseLevel.INTERMEDIATE) {
          expertise.level = ExpertiseLevel.EXPERT;
        }
        expertise.confidenceScore = Math.min(1, expertise.confidenceScore + 0.1 * weight);
        expertise.lastAssessedAt = new Date();
      }
    });

    // 重新计算完读率
    const completedCount = profile.behavior.completionRate * profile.behavior.totalContentsRead;
    profile.behavior.completionRate = (completedCount + 1) / (profile.behavior.totalContentsRead + 1);
  }

  private updateFromContentSkip(profile: CognitiveProfile, event: BehaviorEvent): void {
    const tags = event.contentTags || [];
    
    tags.forEach(tag => {
      if (!profile.behavior.skippedTopics.includes(tag)) {
        profile.behavior.skippedTopics.push(tag);
      }
    });

    // 限制跳过的主题数量
    if (profile.behavior.skippedTopics.length > 20) {
      profile.behavior.skippedTopics = profile.behavior.skippedTopics.slice(-20);
    }
  }

  private updateFromHighlight(profile: CognitiveProfile, event: BehaviorEvent): void {
    profile.behavior.interactionFrequency += 0.1;
    
    // 标记相关主题为反复阅读
    const tags = event.contentTags || [];
    tags.forEach(tag => {
      if (!profile.behavior.revisitedTopics.includes(tag)) {
        profile.behavior.revisitedTopics.push(tag);
      }
    });
  }

  private updateFromSearch(profile: CognitiveProfile, event: BehaviorEvent): void {
    const query = event.metadata?.query as string;
    if (query) {
      profile.context.recentSearches.unshift(query);
      if (profile.context.recentSearches.length > 10) {
        profile.context.recentSearches = profile.context.recentSearches.slice(0, 10);
      }

      // 推断知识盲区
      profile.expertise.forEach(exp => {
        if (query.toLowerCase().includes(exp.domain.toLowerCase())) {
          if (!exp.knowledgeGaps.includes(query)) {
            exp.knowledgeGaps.push(query);
          }
        }
      });
    }
  }

  private updateFromTopicExplore(profile: CognitiveProfile, event: BehaviorEvent): void {
    const topic = event.metadata?.topic as string;
    if (topic) {
      profile.context.currentTopic = topic;
      
      if (!profile.preference.preferredDomains.includes(topic)) {
        profile.preference.preferredDomains.push(topic);
      }
    }
  }

  // ============================================================
  // 内部辅助方法：相似度计算
  // ============================================================

  private calculateDomainSimilarity(
    expertiseA: DomainExpertise[],
    expertiseB: DomainExpertise[],
  ): number {
    const domainsA = new Set(expertiseA.map(e => e.domain));
    const domainsB = new Set(expertiseB.map(e => e.domain));
    
    const intersection = new Set([...domainsA].filter(x => domainsB.has(x)));
    const union = new Set([...domainsA, ...domainsB]);
    
    if (union.size === 0) return 0;

    // 基础Jaccard相似度
    const jaccardScore = intersection.size / union.size;

    // 考虑水平匹配度
    let levelScore = 0;
    intersection.forEach(domain => {
      const expA = expertiseA.find(e => e.domain === domain)!;
      const expB = expertiseB.find(e => e.domain === domain)!;
      if (expA.level === expB.level) {
        levelScore += 1;
      } else if (
        (expA.level === ExpertiseLevel.INTERMEDIATE && expB.level === ExpertiseLevel.EXPERT) ||
        (expA.level === ExpertiseLevel.EXPERT && expB.level === ExpertiseLevel.INTERMEDIATE) ||
        (expA.level === ExpertiseLevel.NOVICE && expB.level === ExpertiseLevel.INTERMEDIATE) ||
        (expA.level === ExpertiseLevel.INTERMEDIATE && expB.level === ExpertiseLevel.NOVICE)
      ) {
        levelScore += 0.5;
      }
    });
    levelScore = intersection.size > 0 ? levelScore / intersection.size : 0;

    return jaccardScore * 0.6 + levelScore * 0.4;
  }

  private calculatePreferenceSimilarity(
    prefA: UserPreference,
    prefB: UserPreference,
  ): number {
    let score = 0;
    let totalWeight = 0;

    // 深度偏好匹配
    if (prefA.depth === prefB.depth) score += 0.3;
    totalWeight += 0.3;

    // 节奏偏好匹配
    if (prefA.pace === prefB.pace) score += 0.25;
    totalWeight += 0.25;

    // 格式偏好匹配
    if (prefA.format === prefB.format) score += 0.2;
    totalWeight += 0.2;

    // 结构偏好匹配
    if (prefA.structure === prefB.structure) score += 0.15;
    totalWeight += 0.15;

    // 领域偏好重叠
    const domainsA = new Set(prefA.preferredDomains);
    const domainsB = new Set(prefB.preferredDomains);
    const intersection = new Set([...domainsA].filter(x => domainsB.has(x)));
    const union = new Set([...domainsA, ...domainsB]);
    if (union.size > 0) {
      score += (intersection.size / union.size) * 0.1;
    }
    totalWeight += 0.1;

    return score / totalWeight;
  }

  private calculateBehaviorSimilarity(
    behaviorA: UserBehavior,
    behaviorB: UserBehavior,
  ): number {
    let score = 0;

    // 完读率相似度（差值越小越相似）
    const completionDiff = Math.abs(behaviorA.completionRate - behaviorB.completionRate);
    score += (1 - completionDiff) * 0.3;

    // 平均阅读时长相似度（使用对数缩放）
    const timeRatio = Math.min(behaviorA.avgReadingTime, behaviorB.avgReadingTime) /
                      Math.max(behaviorA.avgReadingTime, behaviorB.avgReadingTime);
    score += timeRatio * 0.2;

    // 活跃时段重叠
    const hoursA = new Set(behaviorA.peakReadingHours);
    const hoursB = new Set(behaviorB.peakReadingHours);
    const hourIntersection = new Set([...hoursA].filter(x => hoursB.has(x)));
    const hourUnion = new Set([...hoursA, ...hoursB]);
    if (hourUnion.size > 0) {
      score += (hourIntersection.size / hourUnion.size) * 0.25;
    }

    // 标签偏好重叠
    const tagsA = new Set(behaviorA.favoriteTags);
    const tagsB = new Set(behaviorB.favoriteTags);
    const tagIntersection = new Set([...tagsA].filter(x => tagsB.has(x)));
    const tagUnion = new Set([...tagsA, ...tagsB]);
    if (tagUnion.size > 0) {
      score += (tagIntersection.size / tagUnion.size) * 0.25;
    }

    return score;
  }

  private findCommonDomains(
    expertiseA: DomainExpertise[],
    expertiseB: DomainExpertise[],
  ): string[] {
    const domainsA = new Set(expertiseA.map(e => e.domain));
    const domainsB = new Set(expertiseB.map(e => e.domain));
    return [...domainsA].filter(x => domainsB.has(x));
  }

  private findCommonInterests(
    behaviorA: UserBehavior,
    behaviorB: UserBehavior,
  ): string[] {
    const tagsA = new Set(behaviorA.favoriteTags);
    const tagsB = new Set(behaviorB.favoriteTags);
    return [...tagsA].filter(x => tagsB.has(x));
  }

  private findComplementaryExpertise(
    expertiseA: DomainExpertise[],
    expertiseB: DomainExpertise[],
  ): string[] {
    const highLevelA = new Set(
      expertiseA.filter(e => e.level === ExpertiseLevel.EXPERT).map(e => e.domain),
    );
    const lowLevelB = new Set(
      expertiseB.filter(e => e.level !== ExpertiseLevel.EXPERT).map(e => e.domain),
    );
    
    // A擅长而B不擅长的领域
    return [...highLevelA].filter(x => lowLevelB.has(x));
  }

  // ============================================================
  // 内部辅助方法：存储与缓存
  // ============================================================

  private async getCachedProfile(userId: string): Promise<CognitiveProfile | null> {
    try {
      const data = await this.redis.get(`${this.CACHE_PREFIX}${userId}`);
      if (data) {
        return JSON.parse(data, (key, value) => {
          // 恢复Date对象
          if (key.endsWith('At') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
      }
    } catch (error) {
      this.logger.error(`Failed to get cached profile: ${error.message}`);
    }
    return null;
  }

  private async cacheProfile(userId: string, profile: CognitiveProfile): Promise<void> {
    try {
      await this.redis.setex(
        `${this.CACHE_PREFIX}${userId}`,
        this.CACHE_TTL,
        JSON.stringify(profile),
      );
    } catch (error) {
      this.logger.error(`Failed to cache profile: ${error.message}`);
    }
  }

  private async saveProfile(userId: string, profile: CognitiveProfile): Promise<void> {
    // 这里可以保存到专门的画像表
    // 目前先保存到Redis持久化存储
    try {
      await this.redis.set(
        `${this.CACHE_PREFIX}persist:${userId}`,
        JSON.stringify(profile),
      );
    } catch (error) {
      this.logger.error(`Failed to persist profile: ${error.message}`);
    }
  }

  private async getAllProfiles(): Promise<CognitiveProfile[]> {
    // 从Redis获取所有画像（简化实现）
    // 实际应用中应该从数据库分页查询
    try {
      const keys = await this.redis.keys(`${this.CACHE_PREFIX}persist:*`);
      if (keys.length === 0) return [];

      const dataList = await this.redis.mget(...keys);
      return dataList
        .filter(Boolean)
        .map(data => JSON.parse(data!, (key, value) => {
          if (key.endsWith('At') && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        }));
    } catch (error) {
      this.logger.error(`Failed to get all profiles: ${error.message}`);
      return [];
    }
  }

  // ============================================================
  // 辅助API
  // ============================================================

  /**
   * 获取用户最擅长的领域
   */
  async getTopExpertise(userId: string, limit: number = 5): Promise<DomainExpertise[]> {
    const profile = await this.getProfile(userId);
    if (!profile) return [];
    
    return profile.expertise
      .filter(e => e.level === ExpertiseLevel.EXPERT || e.confidenceScore > 0.6)
      .slice(0, limit);
  }

  /**
   * 获取用户知识盲区
   */
  async getKnowledgeGaps(userId: string): Promise<Array<{ domain: string; gaps: string[] }>> {
    const profile = await this.getProfile(userId);
    if (!profile) return [];
    
    return profile.expertise
      .filter(e => e.knowledgeGaps.length > 0)
      .map(e => ({ domain: e.domain, gaps: e.knowledgeGaps }));
  }

  /**
   * 获取推荐学习路径
   */
  async getRecommendedLearningPath(
    userId: string,
    targetDomain: string,
  ): Promise<Array<{ stage: string; resources: string[] }>> {
    const profile = await this.getProfile(userId);
    const expertise = profile?.expertise.find(e => e.domain === targetDomain);
    
    if (!expertise || expertise.level === ExpertiseLevel.NOVICE) {
      return [
        { stage: '基础入门', resources: ['概念定义', '入门教程'] },
        { stage: '实践应用', resources: ['案例分析', '实战练习'] },
        { stage: '深入理解', resources: ['进阶文章', '专家观点'] },
      ];
    } else if (expertise.level === ExpertiseLevel.INTERMEDIATE) {
      return [
        { stage: '进阶深化', resources: ['深度分析', '前沿研究'] },
        { stage: '专家视角', resources: ['行业报告', '专家访谈'] },
      ];
    } else {
      return [
        { stage: '前沿探索', resources: ['最新论文', '创新实践'] },
        { stage: '知识输出', resources: ['写作分享', '教学相长'] },
      ];
    }
  }

  /**
   * 清除用户画像缓存
   */
  async clearProfileCache(userId: string): Promise<void> {
    await this.redis.del(`${this.CACHE_PREFIX}${userId}`);
  }

  /**
   * 重新构建用户画像
   */
  async rebuildProfile(userId: string): Promise<CognitiveProfile> {
    await this.clearProfileCache(userId);
    return this.buildProfile({ userId, lookbackDays: 90 });
  }
}
