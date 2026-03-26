// ============================================================
// 知识卡片服务 (Knowledge Card Service)
// 将概念封装为可学习、可连接、可追踪的知识单元
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  KnowledgeCard,
  ConceptDefinition,
  KnowledgeConnections,
  MasteryProgress,
  CardGenerationOptions,
  CardUpdateInput,
  ReviewSession,
  LearningRecommendation,
  CardFilter,
  CardStatistics,
  MasteryLevel,
  ConceptReference,
  ApplicationExample,
  DebateView,
  VisualAid,
  LearningPlan,
  DEFAULT_CARD_OPTIONS,
  MASTERY_LEVEL_DEFINITIONS,
  REVIEW_INTERVAL_STRATEGY,
} from './knowledge-card.types';
import { CognitiveProfile, ExpertiseLevel } from './user-profile.types';
import { AggregatedStory } from './content-aggregator.types';

@Injectable()
export class KnowledgeCardService {
  private readonly logger = new Logger(KnowledgeCardService.name);

  // 模拟存储 - 实际应使用数据库
  private cards: Map<string, KnowledgeCard> = new Map();
  private reviewSessions: Map<string, ReviewSession> = new Map();

  /**
   * 从聚合故事生成知识卡片
   */
  async generateFromStory(
    userId: string,
    story: AggregatedStory,
    profile?: CognitiveProfile,
    options?: Partial<CardGenerationOptions>,
  ): Promise<KnowledgeCard[]> {
    const mergedOptions = this.mergeOptions(options);
    const cards: KnowledgeCard[] = [];

    // 从主题中提取关键概念
    for (const theme of story.themes.slice(0, mergedOptions.extraction.maxConcepts)) {
      const concept = await this.extractConcept(theme.name, theme, story, profile);
      const connections = await this.discoverConnections(
        concept,
        story,
        profile,
        mergedOptions,
      );

      const card = this.createCard(
        userId,
        concept,
        connections,
        story.id,
        profile,
        mergedOptions,
      );

      cards.push(card);
      this.cards.set(card.id, card);
    }

    // 从观点中提取争议概念
    if (story.perspectives && mergedOptions.connections.includeDebates) {
      const debateCard = await this.createDebateCard(
        userId,
        story.perspectives,
        story,
        profile,
        mergedOptions,
      );
      if (debateCard) {
        cards.push(debateCard);
        this.cards.set(debateCard.id, debateCard);
      }
    }

    this.logger.log(`Generated ${cards.length} knowledge cards for user ${userId}`);
    return cards;
  }

  /**
   * 生成单个知识卡片
   */
  async generate(
    userId: string,
    term: string,
    definition: string,
    profile?: CognitiveProfile,
    options?: Partial<CardGenerationOptions>,
  ): Promise<KnowledgeCard> {
    const mergedOptions = this.mergeOptions(options);

    const concept: ConceptDefinition = {
      term,
      definition,
      shortDefinition: this.createShortDefinition(definition),
      analogy: mergedOptions.analogy.enabled
        ? await this.generateAnalogy(term, definition, profile, mergedOptions)
        : undefined,
    };

    const connections = await this.discoverConnectionsForTerm(
      term,
      profile,
      mergedOptions,
    );

    const card = this.createCard(
      userId,
      concept,
      connections,
      undefined,
      profile,
      mergedOptions,
    );

    this.cards.set(card.id, card);
    return card;
  }

  /**
   * 获取知识卡片
   */
  async getCard(cardId: string, userId: string): Promise<KnowledgeCard | null> {
    const card = this.cards.get(cardId);
    if (!card || card.userId !== userId) {
      return null;
    }
    return card;
  }

  /**
   * 获取用户的所有知识卡片
   */
  async getUserCards(
    userId: string,
    filter?: CardFilter,
  ): Promise<KnowledgeCard[]> {
    let cards = Array.from(this.cards.values()).filter(c => c.userId === userId);

    if (filter) {
      cards = this.applyFilter(cards, filter);
    }

    return cards.sort((a, b) => {
      // 优先按掌握等级排序
      const levelOrder = [MasteryLevel.EXPOSED, MasteryLevel.FAMILIAR, MasteryLevel.MASTERED];
      const levelDiff = levelOrder.indexOf(a.mastery.level) - levelOrder.indexOf(b.mastery.level);
      if (levelDiff !== 0) return levelDiff;

      // 其次按更新时间
      return b.meta.updatedAt.getTime() - a.meta.updatedAt.getTime();
    });
  }

  /**
   * 更新知识卡片
   */
  async updateCard(
    cardId: string,
    userId: string,
    input: CardUpdateInput,
  ): Promise<KnowledgeCard> {
    const card = await this.getCard(cardId, userId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    if (input.concept) {
      card.concept = { ...card.concept, ...input.concept };
    }

    if (input.connections) {
      card.connections = { ...card.connections, ...input.connections };
    }

    if (input.mastery) {
      card.mastery = { ...card.mastery, ...input.mastery };
    }

    if (input.notes !== undefined) {
      card.personalization.notes = input.notes;
    }

    card.meta.updatedAt = new Date();
    card.meta.version += 1;

    this.cards.set(cardId, card);
    return card;
  }

  /**
   * 删除知识卡片
   */
  async deleteCard(cardId: string, userId: string): Promise<boolean> {
    const card = await this.getCard(cardId, userId);
    if (!card) {
      return false;
    }

    this.cards.delete(cardId);
    return true;
  }

  /**
   * 记录复习会话
   */
  async recordReview(
    cardId: string,
    userId: string,
    session: Omit<ReviewSession, 'id' | 'userId' | 'cardId' | 'startedAt'>,
  ): Promise<ReviewSession> {
    const card = await this.getCard(cardId, userId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const reviewSession: ReviewSession = {
      id: this.generateId('review'),
      userId,
      cardId,
      startedAt: new Date(),
      ...session,
    };

    // 更新卡片掌握进度
    const newMastery = this.calculateNewMastery(card.mastery, reviewSession);
    card.mastery = newMastery;
    card.meta.updatedAt = new Date();

    this.reviewSessions.set(reviewSession.id, reviewSession);
    this.cards.set(cardId, card);

    return reviewSession;
  }

  /**
   * 获取需要复习的卡片
   */
  async getDueCards(userId: string, limit?: number): Promise<KnowledgeCard[]> {
    const now = new Date();
    let cards = Array.from(this.cards.values()).filter(c => {
      if (c.userId !== userId) return false;
      if (!c.mastery.nextReview) return true;
      return c.mastery.nextReview <= now;
    });

    // 按复习时间排序
    cards.sort((a, b) => {
      const aTime = a.mastery.nextReview?.getTime() || 0;
      const bTime = b.mastery.nextReview?.getTime() || 0;
      return aTime - bTime;
    });

    if (limit) {
      cards = cards.slice(0, limit);
    }

    return cards;
  }

  /**
   * 生成学习推荐
   */
  async generateRecommendations(
    userId: string,
    profile?: CognitiveProfile,
  ): Promise<LearningRecommendation[]> {
    const recommendations: LearningRecommendation[] = [];
    const userCards = await this.getUserCards(userId);

    // 推荐需要复习的卡片
    const dueCards = await this.getDueCards(userId, 5);
    for (const card of dueCards) {
      recommendations.push({
        type: 'review',
        cardId: card.id,
        concept: {
          id: card.id,
          term: card.concept.term,
          definition: card.concept.shortDefinition,
          relevanceScore: 1,
          relationType: 'relatedTo',
        },
        reason: `距离上次复习已有 ${this.daysSince(card.mastery.lastReview)} 天`,
        priority: card.mastery.level === MasteryLevel.EXPOSED ? 'high' : 'medium',
        estimatedTime: this.estimateReviewTime(card),
      });
    }

    // 推荐可以深化的卡片（自信度低于阈值的已熟悉卡片）
    const deepenCandidates = userCards.filter(
      c => c.mastery.level === MasteryLevel.FAMILIAR && c.mastery.confidence < 0.7,
    );
    for (const card of deepenCandidates.slice(0, 3)) {
      recommendations.push({
        type: 'deepen',
        cardId: card.id,
        concept: {
          id: card.id,
          term: card.concept.term,
          definition: card.concept.shortDefinition,
          relevanceScore: 0.8,
          relationType: 'relatedTo',
        },
        reason: '自信度较低，建议深入学习',
        priority: 'medium',
        estimatedTime: 15,
      });
    }

    // 推荐建立连接（已掌握卡片之间的连接）
    const masteredCards = userCards.filter(c => c.mastery.level === MasteryLevel.MASTERED);
    if (masteredCards.length >= 2) {
      recommendations.push({
        type: 'connect',
        reason: `你已掌握 ${masteredCards.length} 个概念，建议探索它们之间的联系`,
        priority: 'low',
        estimatedTime: 10,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 获取学习统计
   */
  async getStatistics(userId: string): Promise<CardStatistics> {
    const cards = await this.getUserCards(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const byMastery: Record<MasteryLevel, number> = {
      [MasteryLevel.EXPOSED]: 0,
      [MasteryLevel.FAMILIAR]: 0,
      [MasteryLevel.MASTERED]: 0,
    };

    const byDomain: Record<string, number> = {};

    let dueToday = 0;
    let overdue = 0;
    let completedToday = 0;

    for (const card of cards) {
      byMastery[card.mastery.level]++;

      byDomain[card.meta.domain] = (byDomain[card.meta.domain] || 0) + 1;

      if (card.mastery.nextReview) {
        if (card.mastery.nextReview < today) {
          overdue++;
        } else if (card.mastery.nextReview <= new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
          dueToday++;
        }
      }

      if (card.mastery.lastReview >= today) {
        completedToday++;
      }
    }

    // 计算学习速度
    const recentCards = cards.filter(
      c => c.mastery.firstExposure >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    );

    return {
      userId,
      totalCards: cards.length,
      byMastery,
      byDomain,
      reviewStats: {
        dueToday,
        overdue,
        completedToday,
        streakDays: this.calculateStreak(userId),
      },
      learningVelocity: {
        cardsPerDay: recentCards.length / 30,
        avgConfidenceGrowth: this.calculateAvgConfidenceGrowth(cards),
      },
    };
  }

  /**
   * 创建学习计划
   */
  async createLearningPlan(
    cardId: string,
    userId: string,
    profile?: CognitiveProfile,
  ): Promise<LearningPlan> {
    const card = await this.getCard(cardId, userId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const stages = [
      {
        stage: MasteryLevel.EXPOSED,
        objectives: ['了解术语含义', '记住核心定义'],
        estimatedTime: 5,
        resources: ['概念定义', '类比解释'],
      },
      {
        stage: MasteryLevel.FAMILIAR,
        objectives: ['能用自己的话解释', '理解应用场景', '知道前置知识'],
        estimatedTime: 15,
        resources: ['详细定义', '应用案例', '前置知识卡片'],
      },
      {
        stage: MasteryLevel.MASTERED,
        objectives: ['能教授他人', '能分析边界情况', '建立知识连接'],
        estimatedTime: 30,
        resources: ['延伸阅读', '争议观点', '实践练习'],
      },
    ];

    // 根据当前掌握等级过滤
    const currentLevelIndex = stages.findIndex(s => s.stage === card.mastery.level);
    const remainingStages = stages.slice(currentLevelIndex + 1);

    // 构建推荐路径
    const recommendedPath: string[] = [];
    for (const prereq of card.connections.prerequisites) {
      if (prereq.cardId) {
        recommendedPath.push(prereq.cardId);
      }
    }
    recommendedPath.push(cardId);
    for (const ext of card.connections.extensions.slice(0, 3)) {
      if (ext.cardId) {
        recommendedPath.push(ext.cardId);
      }
    }

    return {
      stages: remainingStages,
      recommendedPath,
    };
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  private mergeOptions(
    options?: Partial<CardGenerationOptions>,
  ): CardGenerationOptions {
    return {
      ...DEFAULT_CARD_OPTIONS,
      ...options,
      extraction: { ...DEFAULT_CARD_OPTIONS.extraction, ...options?.extraction },
      analogy: { ...DEFAULT_CARD_OPTIONS.analogy, ...options?.analogy },
      visual: { ...DEFAULT_CARD_OPTIONS.visual, ...options?.visual },
      connections: { ...DEFAULT_CARD_OPTIONS.connections, ...options?.connections },
      personalization: { ...DEFAULT_CARD_OPTIONS.personalization, ...options?.personalization },
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async extractConcept(
    term: string,
    theme: any,
    story: AggregatedStory,
    profile?: CognitiveProfile,
  ): Promise<ConceptDefinition> {
    // 从主题内容构建定义
    const definition = theme.summary || `${term}是一个重要概念`;

    return {
      term,
      definition,
      shortDefinition: this.createShortDefinition(definition),
      origin: undefined,
    };
  }

  private createShortDefinition(definition: string): string {
    // 提取第一句话或前100个字符
    const sentences = definition.split(/[。！？.!?]/);
    const first = sentences[0].trim();
    if (first.length <= 100) return first;
    return first.substring(0, 100) + '...';
  }

  private async generateAnalogy(
    term: string,
    definition: string,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): Promise<string | undefined> {
    // 根据概念特征生成类比
    // 实际实现中应该使用AI生成更贴切的类比
    const analogies: Record<string, string> = {
      'AI': '像一个不断学习的学徒，从大量例子中找规律',
      '神经网络': '像人脑中的神经元网络，通过连接传递信号',
      '算法': '像一个食谱，告诉计算机一步步怎么做',
      '数据库': '像一个整理好的档案柜，可以快速找到需要的信息',
    };

    for (const [key, value] of Object.entries(analogies)) {
      if (term.toLowerCase().includes(key.toLowerCase()) ||
          definition.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return `就像生活中的${this.getRandomAnalogyBase()}一样`;
  }

  private getRandomAnalogyBase(): string {
    const bases = ['工具', '语言', '建筑', '生态系统', '交通网络'];
    return bases[Math.floor(Math.random() * bases.length)];
  }

  private async discoverConnections(
    concept: ConceptDefinition,
    story: AggregatedStory,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): Promise<KnowledgeConnections> {
    const prerequisites: ConceptReference[] = [];
    const extensions: ConceptReference[] = [];
    const applications: ApplicationExample[] = [];
    const debates: DebateView[] = [];

    // 从主题关键词提取前置知识
    for (const theme of story.themes) {
      for (const keyword of theme.keywords.slice(0, 3)) {
        if (keyword !== concept.term) {
          extensions.push({
            id: this.generateId('concept'),
            term: keyword,
            definition: `${keyword}相关概念`,
            relevanceScore: 0.7,
            relationType: 'relatedTo',
          });
        }
      }
    }

    // 从观点提取争议
    if (story.perspectives) {
      for (const perspective of story.perspectives.perspectives.slice(0, 2)) {
        debates.push({
          id: this.generateId('debate'),
          viewpoint: perspective.mainArgument,
          proponents: [perspective.source.author || 'unknown'],
          supportingEvidence: perspective.evidence.map(e => e.content),
          counterArguments: [],
          significance: 'interpretive',
        });
      }
    }

    return {
      prerequisites: prerequisites.slice(0, options?.connections?.maxPrerequisites || 5),
      extensions: extensions.slice(0, options?.connections?.maxExtensions || 5),
      applications: applications.slice(0, options?.connections?.maxApplications || 3),
      debates,
      relatedCards: [],
    };
  }

  private async discoverConnectionsForTerm(
    term: string,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): Promise<KnowledgeConnections> {
    // 根据术语发现相关连接
    return {
      prerequisites: [],
      extensions: [],
      applications: [{
        id: this.generateId('app'),
        title: `${term}的典型应用`,
        description: `${term}在实际场景中的应用`,
        domain: 'general',
        complexity: 'moderate',
        prerequisites: [],
      }],
      debates: [],
      relatedCards: [],
    };
  }

  private async createDebateCard(
    userId: string,
    perspectives: any,
    story: AggregatedStory,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): Promise<KnowledgeCard | null> {
    if (!perspectives || perspectives.perspectives.length < 2) {
      return null;
    }

    const concept: ConceptDefinition = {
      term: `争议: ${perspectives.topic}`,
      definition: `${perspectives.topic}是一个存在多种观点的争议性话题`,
      shortDefinition: `关于${perspectives.topic}的不同观点`,
    };

    const debates: DebateView[] = perspectives.perspectives.map((p: any) => ({
      id: this.generateId('debate'),
      viewpoint: p.mainArgument,
      proponents: [p.source.author || 'unknown'],
      supportingEvidence: p.evidence.map((e: any) => e.content),
      counterArguments: [],
      significance: 'interpretive',
    }));

    const connections: KnowledgeConnections = {
      prerequisites: [],
      extensions: [],
      applications: [],
      debates,
      relatedCards: [],
    };

    return this.createCard(userId, concept, connections, story.id, profile, options);
  }

  private createCard(
    userId: string,
    concept: ConceptDefinition,
    connections: KnowledgeConnections,
    sourceStoryId?: string,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): KnowledgeCard {
    const now = new Date();

    // 根据用户画像调整内容
    const adjustedConcept = this.adjustConceptForProfile(concept, profile, options);
    const filteredConnections = this.filterConnectionsForProfile(connections, profile, options);

    return {
      id: this.generateId('card'),
      userId,
      concept: adjustedConcept,
      connections: filteredConnections,
      mastery: {
        level: MasteryLevel.EXPOSED,
        reviewCount: 0,
        lastReview: now,
        confidence: 0.1,
        exposureCount: 1,
        firstExposure: now,
        stats: {
          avgReviewInterval: 0,
          forgettingCurve: [1.0],
          learningTimeSpent: 0,
        },
      },
      meta: {
        domain: profile?.expertise?.[0]?.domain || 'general',
        tags: [],
        createdAt: now,
        updatedAt: now,
        version: 1,
        sourceContentIds: sourceStoryId ? [sourceStoryId] : [],
        generatedBy: 'ai',
      },
      personalization: {
        difficultyAdjusted: !!profile,
        analogyCustomized: !!adjustedConcept.analogy,
        prerequisiteFiltered: !!profile,
      },
    };
  }

  private adjustConceptForProfile(
    concept: ConceptDefinition,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): ConceptDefinition {
    if (!profile || !options?.personalization?.adaptToProfile) {
      return concept;
    }

    const level = profile.expertise?.[0]?.level;
    const adjusted = { ...concept };

    // 根据知识水平调整定义
    if (level === ExpertiseLevel.NOVICE) {
      // 为新手添加更多解释
      if (!adjusted.analogy) {
        adjusted.analogy = `${concept.term}就像...`;
      }
    } else if (level === ExpertiseLevel.EXPERT) {
      // 为专家提供更简洁的定义
      adjusted.shortDefinition = concept.definition.substring(0, 50);
    }

    return adjusted;
  }

  private filterConnectionsForProfile(
    connections: KnowledgeConnections,
    profile?: CognitiveProfile,
    options?: CardGenerationOptions,
  ): KnowledgeConnections {
    if (!profile || !options?.personalization?.respectKnownConcepts) {
      return connections;
    }

    const knownConcepts = profile.expertise?.flatMap(e => e.knownConcepts) || [];

    // 过滤前置知识：移除用户已知的概念
    const filteredPrerequisites = connections.prerequisites.filter(
      p => !knownConcepts.some(k => p.term.includes(k) || k.includes(p.term)),
    );

    return {
      ...connections,
      prerequisites: filteredPrerequisites,
    };
  }

  private calculateNewMastery(
    current: MasteryProgress,
    session: ReviewSession,
  ): MasteryProgress {
    const results = session.results;
    const now = new Date();

    // 更新自信度
    const confidenceDelta = results.confidenceDelta;
    const newConfidence = Math.max(0, Math.min(1, current.confidence + confidenceDelta));

    // 判断是否升级
    let newLevel = current.level;
    if (results.levelChanged && results.newLevel) {
      newLevel = results.newLevel;
    } else if (newConfidence >= 0.85 && current.level === MasteryLevel.FAMILIAR) {
      newLevel = MasteryLevel.MASTERED;
    } else if (newConfidence >= 0.5 && current.level === MasteryLevel.EXPOSED) {
      newLevel = MasteryLevel.FAMILIAR;
    }

    // 计算下次复习时间
    const strategy = REVIEW_INTERVAL_STRATEGY[newLevel];
    const interval = Math.min(
      strategy.initialInterval * Math.pow(strategy.multiplier, current.reviewCount),
      strategy.maxInterval,
    );
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    return {
      ...current,
      level: newLevel,
      reviewCount: current.reviewCount + 1,
      lastReview: now,
      nextReview,
      confidence: newConfidence,
      exposureCount: current.exposureCount + 1,
      stats: {
        ...current.stats,
        avgReviewInterval: this.calculateAvgReviewInterval(current, now),
        forgettingCurve: [...current.stats.forgettingCurve, results.score],
        learningTimeSpent: current.stats.learningTimeSpent + results.timeSpent / 60,
      },
    };
  }

  private calculateAvgReviewInterval(current: MasteryProgress, now: Date): number {
    if (current.reviewCount === 0) return 0;
    const daysSinceFirst = (now.getTime() - current.firstExposure.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceFirst / current.reviewCount;
  }

  private daysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  }

  private estimateReviewTime(card: KnowledgeCard): number {
    switch (card.mastery.level) {
      case MasteryLevel.EXPOSED:
        return 5;
      case MasteryLevel.FAMILIAR:
        return 3;
      case MasteryLevel.MASTERED:
        return 2;
      default:
        return 3;
    }
  }

  private applyFilter(cards: KnowledgeCard[], filter: CardFilter): KnowledgeCard[] {
    return cards.filter(card => {
      if (filter.domain && card.meta.domain !== filter.domain) {
        return false;
      }
      if (filter.masteryLevel && card.mastery.level !== filter.masteryLevel) {
        return false;
      }
      if (filter.tags && filter.tags.length > 0) {
        if (!filter.tags.some(tag => card.meta.tags.includes(tag))) {
          return false;
        }
      }
      if (filter.dueForReview) {
        if (!card.mastery.nextReview || card.mastery.nextReview > new Date()) {
          return false;
        }
      }
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchTerm = card.concept.term.toLowerCase().includes(query);
        const matchDef = card.concept.definition.toLowerCase().includes(query);
        if (!matchTerm && !matchDef) {
          return false;
        }
      }
      if (filter.dateRange) {
        if (card.meta.createdAt < filter.dateRange.from ||
            card.meta.createdAt > filter.dateRange.to) {
          return false;
        }
      }
      return true;
    });
  }

  private calculateStreak(userId: string): number {
    // 简化实现：从复习会话计算连续天数
    const sessions = Array.from(this.reviewSessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.completedAt?.getTime() || 0 - (a.completedAt?.getTime() || 0));

    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const hasReview = sessions.some(s => {
        const sessionDate = s.completedAt || s.startedAt;
        const sessionDay = new Date(sessionDate);
        sessionDay.setHours(0, 0, 0, 0);
        return sessionDay.getTime() === checkDate.getTime();
      });

      if (hasReview) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  private calculateAvgConfidenceGrowth(cards: KnowledgeCard[]): number {
    if (cards.length === 0) return 0;

    const cardsWithHistory = cards.filter(c => c.mastery.stats.forgettingCurve.length >= 2);
    if (cardsWithHistory.length === 0) return 0;

    let totalGrowth = 0;
    for (const card of cardsWithHistory) {
      const curve = card.mastery.stats.forgettingCurve;
      const first = curve[0];
      const last = curve[curve.length - 1];
      totalGrowth += last - first;
    }

    return totalGrowth / cardsWithHistory.length;
  }
}
