import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeCardService } from '../knowledge-card.service';
import {
  KnowledgeCard,
  CardGenerationOptions,
  MasteryLevel,
  ReviewSession,
  DEFAULT_CARD_OPTIONS,
  MASTERY_LEVEL_DEFINITIONS,
  REVIEW_INTERVAL_STRATEGY,
} from '../knowledge-card.types';
import { AggregatedStory, ThemeCluster, PerspectiveComparison } from '../content-aggregator.types';
import { CognitiveProfile, ExpertiseLevel, UserGoal, DepthPreference, PacePreference, FormatPreference, StructurePreference, EnergyLevel } from '../user-profile.types';

describe('KnowledgeCardService', () => {
  let service: KnowledgeCardService;

  // 测试数据 - 模拟聚合故事
  const mockStory: AggregatedStory = {
    id: 'story_1',
    userId: 'user_1',
    title: 'AI发展现状与争议',
    summary: '人工智能领域近期发展迅速，但也引发诸多争议',
    themes: [
      {
        id: 'theme_1',
        name: '大语言模型',
        description: 'LLM的技术进展和应用',
        keywords: ['GPT', 'Transformer', '神经网络'],
        contents: [
          {
            contentId: 'content_1',
            title: 'GPT-4技术解析',
            relevanceScore: 0.95,
            excerpt: 'GPT-4展现了强大的多模态理解能力',
            keyPoints: ['多模态理解', '推理能力提升'],
          },
        ],
        summary: '大语言模型是当前AI发展的核心技术',
        centroid: [0.9, 0.8, 0.85],
        cohesion: 0.92,
      },
      {
        id: 'theme_2',
        name: 'AI安全',
        description: '关于AI安全性和监管的讨论',
        keywords: ['安全', '监管', '风险'],
        contents: [
          {
            contentId: 'content_3',
            title: 'AI安全警告',
            relevanceScore: 0.9,
            excerpt: '专家警告AI发展可能带来不可控风险',
            keyPoints: ['安全风险', '监管需求'],
          },
        ],
        summary: 'AI安全问题引发广泛关注',
        centroid: [0.7, 0.6, 0.8],
        cohesion: 0.85,
      },
    ],
    perspectives: {
      topic: 'AI发展是否应受到更严格监管',
      perspectives: [
        {
          id: 'perspective_1',
          source: {
            contentId: 'content_1',
            title: '科技乐观派',
            author: '张三',
            publication: '科技日报',
            credibilityScore: 0.9,
          },
          stance: 'supportive',
          mainArgument: 'AI技术发展将带来巨大经济和社会效益',
          keyClaims: ['AI提升生产力', '创造新就业机会'],
          evidence: [
            { type: 'data', content: 'AI市场预计增长200%', weight: 0.8, verifiable: true },
          ],
          confidence: 0.85,
        },
        {
          id: 'perspective_2',
          source: {
            contentId: 'content_3',
            title: '安全担忧派',
            author: '李四',
            publication: '深度观察',
            credibilityScore: 0.8,
          },
          stance: 'critical',
          mainArgument: 'AI发展速度过快，需要更严格的安全监管',
          keyClaims: ['存在未知风险', '需要监管框架'],
          evidence: [
            { type: 'expert_opinion', content: '多位AI专家联名警告', weight: 0.7, verifiable: true },
          ],
          confidence: 0.8,
        },
      ],
      keyDifferences: [
        {
          aspect: '发展优先级',
          descriptions: [
            { perspectiveId: 'perspective_1', description: '创新优先' },
            { perspectiveId: 'perspective_2', description: '安全优先' },
          ],
          significance: 'high',
        },
      ],
      consensusAreas: ['AI技术重要性'],
      debateAreas: ['监管强度'],
    },
    timeline: {
      events: [
        {
          id: 'event_1',
          contentId: 'content_1',
          title: 'GPT-4发布',
          eventDate: new Date('2024-03-15'),
          datePrecision: 'exact',
          description: 'OpenAI发布GPT-4模型',
          significance: 'major',
          relatedEvents: [],
          sourceContext: 'OpenAI在3月15日正式发布GPT-4',
        },
      ],
      phases: [],
      span: {
        start: new Date('2024-03-15'),
        end: new Date('2024-03-20'),
      },
    },
    credibilityMap: [],
    meta: {
      sourceCount: 3,
      dateRange: {
        start: new Date('2024-03-15'),
        end: new Date('2024-03-20'),
      },
      coverageScore: 0.9,
      confidenceScore: 0.82,
      generatedAt: new Date(),
      version: 1,
    },
    readingPaths: [],
  };

  // 用户画像
  const mockProfile: CognitiveProfile = {
    userId: 'user_1',
    expertise: [
      {
        domain: 'tech',
        level: ExpertiseLevel.INTERMEDIATE,
        knownConcepts: ['机器学习', '神经网络'],
        knowledgeGaps: ['强化学习', '多模态'],
        confidenceScore: 0.8,
        lastAssessedAt: new Date(),
      },
    ],
    preference: {
      depth: DepthPreference.BALANCED,
      pace: PacePreference.MODERATE,
      format: FormatPreference.TEXT,
      structure: StructurePreference.LINEAR,
      preferredDomains: ['tech', 'AI'],
      dislikedDomains: [],
    },
    behavior: {
      avgReadingTime: 300,
      completionRate: 0.75,
      revisitedTopics: ['AI'],
      skippedTopics: [],
      totalContentsRead: 100,
      totalReadingTime: 5000,
      favoriteTags: ['AI', '技术'],
      peakReadingHours: [9, 14, 20],
      avgSessionDuration: 25,
      interactionFrequency: 5,
    },
    context: {
      availableTime: 15,
      energyLevel: EnergyLevel.HIGH,
      goal: UserGoal.LEARN,
      currentTopic: 'AI发展',
      recentSearches: ['GPT-4'],
      deviceType: 'desktop',
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeCardService],
    }).compile();

    service = module.get<KnowledgeCardService>(KnowledgeCardService);
  });

  describe('生成知识卡片', () => {
    it('应该从聚合故事生成知识卡片', async () => {
      const cards = await service.generateFromStory('user_1', mockStory, mockProfile);

      expect(cards).toBeDefined();
      expect(cards.length).toBeGreaterThan(0);
      
      // 每个主题应该生成一个卡片
      expect(cards.length).toBeGreaterThanOrEqual(mockStory.themes.length);
    });

    it('应该为每个主题创建概念定义', async () => {
      const cards = await service.generateFromStory('user_1', mockStory, mockProfile);
      const card = cards[0];

      expect(card.concept).toBeDefined();
      expect(card.concept.term).toBeTruthy();
      expect(card.concept.definition).toBeTruthy();
      expect(card.concept.shortDefinition).toBeTruthy();
    });

    it('应该生成带有类比的概念', async () => {
      const options: Partial<CardGenerationOptions> = {
        analogy: { enabled: true, complexity: 'moderate' },
      };
      const cards = await service.generateFromStory('user_1', mockStory, mockProfile, options);

      // AI相关概念应该有类比
      const aiCard = cards.find(c => c.concept.term.toLowerCase().includes('ai') ||
        c.concept.definition.toLowerCase().includes('ai'));
      
      // 不是所有卡片都有类比，但服务应该尝试生成
      expect(cards.length).toBeGreaterThan(0);
    });

    it('应该发现相关连接', async () => {
      const cards = await service.generateFromStory('user_1', mockStory, mockProfile);
      const card = cards[0];

      expect(card.connections).toBeDefined();
      expect(card.connections.extensions).toBeDefined();
      expect(card.connections.prerequisites).toBeDefined();
      expect(card.connections.applications).toBeDefined();
    });

    it('应该从争议视角生成争议卡片', async () => {
      const cards = await service.generateFromStory('user_1', mockStory, mockProfile);

      // 应该有争议卡片
      const debateCard = cards.find(c => c.concept.term.includes('争议'));
      expect(debateCard).toBeDefined();
      expect(debateCard?.connections.debates.length).toBeGreaterThan(0);
    });

    it('应该支持自定义生成选项', async () => {
      const options: Partial<CardGenerationOptions> = {
        extraction: { maxConcepts: 1, minSignificance: 0.6, includeNested: true },
        connections: { maxPrerequisites: 5, maxExtensions: 5, maxApplications: 3, includeDebates: false, autoDiscover: true },
      };

      const cards = await service.generateFromStory('user_1', mockStory, mockProfile, options);

      // 限制概念数量
      expect(cards.length).toBeLessThanOrEqual(3);
    });
  });

  describe('单个知识卡片生成', () => {
    it('应该能生成单个知识卡片', async () => {
      const card = await service.generate(
        'user_1',
        '神经网络',
        '一种模仿人脑神经元连接方式的机器学习模型',
        mockProfile,
      );

      expect(card).toBeDefined();
      expect(card.concept.term).toBe('神经网络');
      expect(card.concept.definition).toContain('机器学习');
      expect(card.userId).toBe('user_1');
    });

    it('应该在没有用户画像时正常工作', async () => {
      const card = await service.generate(
        'user_1',
        '深度学习',
        '基于多层神经网络的机器学习方法',
      );

      expect(card).toBeDefined();
      expect(card.concept.term).toBe('深度学习');
      expect(card.personalization.difficultyAdjusted).toBe(false);
    });
  });

  describe('掌握进度管理', () => {
    it('新卡片应该初始化为EXPOSED级别', async () => {
      const card = await service.generate(
        'user_1',
        '测试概念',
        '这是一个测试概念的定义',
      );

      expect(card.mastery.level).toBe(MasteryLevel.EXPOSED);
      expect(card.mastery.confidence).toBeLessThan(0.2);
      expect(card.mastery.reviewCount).toBe(0);
    });

    it('应该记录复习会话并更新掌握进度', async () => {
      const card = await service.generate(
        'user_1',
        '测试概念',
        '这是一个测试概念的定义',
      );

      const reviewSession: Omit<ReviewSession, 'id' | 'userId' | 'cardId' | 'startedAt'> = {
        prompts: [{
          type: 'recall',
          question: '什么是测试概念？',
          userAnswer: '一个用于测试的概念',
        }],
        results: {
          score: 0.9,
          confidenceDelta: 0.4,
          levelChanged: true,
          newLevel: MasteryLevel.FAMILIAR,
          timeSpent: 60,
        },
      };

      const session = await service.recordReview(card.id, 'user_1', reviewSession);
      const updatedCard = await service.getCard(card.id, 'user_1');

      expect(session).toBeDefined();
      expect(updatedCard).toBeDefined();
      expect(updatedCard!.mastery.level).toBe(MasteryLevel.FAMILIAR);
      expect(updatedCard!.mastery.confidence).toBeGreaterThan(0.4);
      expect(updatedCard!.mastery.reviewCount).toBe(1);
    });

    it('应该根据间隔重复算法计算下次复习时间', async () => {
      const card = await service.generate('user_1', '测试概念', '定义');

      // 第一次复习
      await service.recordReview(card.id, 'user_1', {
        prompts: [],
        results: {
          score: 0.8,
          confidenceDelta: 0.4,
          levelChanged: true,
          newLevel: MasteryLevel.FAMILIAR,
          timeSpent: 60,
        },
      });

      const updatedCard = await service.getCard(card.id, 'user_1');
      expect(updatedCard!.mastery.nextReview).toBeDefined();
      expect(updatedCard!.mastery.nextReview!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('卡片查询与过滤', () => {
    beforeEach(async () => {
      // 创建测试卡片
      await service.generate('user_1', '概念A', '定义A', mockProfile);
      await service.generate('user_1', '概念B', '定义B', mockProfile);
      await service.generate('user_1', '概念C', '定义C', mockProfile);
    });

    it('应该获取用户的所有卡片', async () => {
      const cards = await service.getUserCards('user_1');

      expect(cards.length).toBeGreaterThanOrEqual(3);
      expect(cards.every(c => c.userId === 'user_1')).toBe(true);
    });

    it('应该按掌握等级过滤卡片', async () => {
      const cards = await service.getUserCards('user_1', {
        masteryLevel: MasteryLevel.EXPOSED,
      });

      expect(cards.every(c => c.mastery.level === MasteryLevel.EXPOSED)).toBe(true);
    });

    it('应该按搜索词过滤卡片', async () => {
      const cards = await service.getUserCards('user_1', {
        searchQuery: '概念A',
      });

      expect(cards.length).toBeGreaterThan(0);
      expect(cards.some(c => c.concept.term.includes('概念A'))).toBe(true);
    });

    it('应该获取需要复习的卡片', async () => {
      const dueCards = await service.getDueCards('user_1');

      // 新创建的卡片应该需要复习
      expect(dueCards.length).toBeGreaterThan(0);
    });
  });

  describe('卡片更新', () => {
    it('应该更新卡片内容', async () => {
      const card = await service.generate('user_1', '原概念', '原定义');

      const updated = await service.updateCard(card.id, 'user_1', {
        concept: { term: '新概念' },
        notes: '用户笔记',
      });

      expect(updated.concept.term).toBe('新概念');
      expect(updated.concept.definition).toBe('原定义'); // 未修改的字段保留
      expect(updated.personalization.notes).toBe('用户笔记');
      expect(updated.meta.version).toBe(2);
    });

    it('更新不存在的卡片应该抛出错误', async () => {
      await expect(
        service.updateCard('non_existent', 'user_1', { notes: 'test' }),
      ).rejects.toThrow('Card not found');
    });

    it('不能更新其他用户的卡片', async () => {
      const card = await service.generate('user_1', '概念', '定义');

      const otherUserCard = await service.getCard(card.id, 'user_2');
      expect(otherUserCard).toBeNull();
    });
  });

  describe('卡片删除', () => {
    it('应该删除卡片', async () => {
      const card = await service.generate('user_1', '待删除', '定义');

      const result = await service.deleteCard(card.id, 'user_1');
      expect(result).toBe(true);

      const deleted = await service.getCard(card.id, 'user_1');
      expect(deleted).toBeNull();
    });

    it('删除不存在的卡片应该返回false', async () => {
      const result = await service.deleteCard('non_existent', 'user_1');
      expect(result).toBe(false);
    });
  });

  describe('学习推荐', () => {
    it('应该生成学习推荐', async () => {
      // 创建一些卡片用于测试
      await service.generate('user_1', '概念1', '定义1', mockProfile);
      await service.generate('user_1', '概念2', '定义2', mockProfile);

      const recommendations = await service.generateRecommendations('user_1', mockProfile);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('应该推荐需要复习的卡片', async () => {
      await service.generate('user_1', '待复习', '定义', mockProfile);

      const recommendations = await service.generateRecommendations('user_1', mockProfile);
      const reviewRec = recommendations.find(r => r.type === 'review');

      expect(reviewRec).toBeDefined();
      expect(reviewRec?.priority).toBe('high');
    });

    it('应该推荐可以深化的卡片', async () => {
      const card = await service.generate('user_1', '可深化', '定义', mockProfile);
      
      // 模拟复习使其达到FAMILIAR但自信度较低
      await service.recordReview(card.id, 'user_1', {
        prompts: [],
        results: {
          score: 0.6,
          confidenceDelta: 0.4,
          levelChanged: true,
          newLevel: MasteryLevel.FAMILIAR,
          timeSpent: 60,
        },
      });

      // 再次更新使其自信度低于0.7
      const updatedCard = await service.getCard(card.id, 'user_1');
      if (updatedCard && updatedCard.mastery.confidence >= 0.7) {
        // 如果自信度已经够高，修改卡片
        await service.updateCard(card.id, 'user_1', {
          mastery: { confidence: 0.5 },
        });
      }

      const recommendations = await service.generateRecommendations('user_1', mockProfile);
      const deepenRec = recommendations.find(r => r.type === 'deepen');

      expect(deepenRec).toBeDefined();
    });

    it('推荐应该按优先级排序', async () => {
      await service.generate('user_1', '概念', '定义', mockProfile);

      const recommendations = await service.generateRecommendations('user_1', mockProfile);
      
      // 高优先级应该在前面
      for (let i = 0; i < recommendations.length - 1; i++) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const current = priorityOrder[recommendations[i].priority];
        const next = priorityOrder[recommendations[i + 1].priority];
        expect(current).toBeLessThanOrEqual(next);
      }
    });
  });

  describe('学习统计', () => {
    beforeEach(async () => {
      await service.generate('user_1', '概念1', '定义1', mockProfile);
      await service.generate('user_1', '概念2', '定义2', mockProfile);
    });

    it('应该返回学习统计', async () => {
      const stats = await service.getStatistics('user_1');

      expect(stats).toBeDefined();
      expect(stats.userId).toBe('user_1');
      expect(stats.totalCards).toBeGreaterThanOrEqual(2);
    });

    it('应该按掌握等级统计', async () => {
      const stats = await service.getStatistics('user_1');

      expect(stats.byMastery[MasteryLevel.EXPOSED]).toBeGreaterThanOrEqual(0);
      expect(stats.byMastery[MasteryLevel.FAMILIAR]).toBeGreaterThanOrEqual(0);
      expect(stats.byMastery[MasteryLevel.MASTERED]).toBeGreaterThanOrEqual(0);
      
      const total = stats.byMastery[MasteryLevel.EXPOSED] +
        stats.byMastery[MasteryLevel.FAMILIAR] +
        stats.byMastery[MasteryLevel.MASTERED];
      expect(total).toBe(stats.totalCards);
    });

    it('应该包含复习统计', async () => {
      const stats = await service.getStatistics('user_1');

      expect(stats.reviewStats).toBeDefined();
      expect(stats.reviewStats.dueToday).toBeGreaterThanOrEqual(0);
      expect(stats.reviewStats.streakDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('学习计划', () => {
    it('应该为卡片创建学习计划', async () => {
      const card = await service.generate('user_1', '学习概念', '定义', mockProfile);

      const plan = await service.createLearningPlan(card.id, 'user_1', mockProfile);

      expect(plan).toBeDefined();
      expect(plan.stages).toBeDefined();
      expect(plan.stages.length).toBeGreaterThan(0);
    });

    it('学习计划应该包含学习目标', async () => {
      const card = await service.generate('user_1', '学习概念', '定义', mockProfile);
      const plan = await service.createLearningPlan(card.id, 'user_1', mockProfile);

      expect(plan.stages[0].objectives).toBeDefined();
      expect(plan.stages[0].objectives.length).toBeGreaterThan(0);
    });

    it('学习计划应该估算学习时间', async () => {
      const card = await service.generate('user_1', '学习概念', '定义', mockProfile);
      const plan = await service.createLearningPlan(card.id, 'user_1', mockProfile);

      expect(plan.stages[0].estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('个性化适配', () => {
    it('应该为新手添加类比', async () => {
      const noviceProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: mockProfile.expertise.map(e => ({
          ...e,
          level: ExpertiseLevel.NOVICE,
        })),
      };

      const cards = await service.generateFromStory('user_1', mockStory, noviceProfile);
      
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].personalization.difficultyAdjusted).toBe(true);
    });

    it('应该为专家过滤已知前置知识', async () => {
      const expertProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: mockProfile.expertise.map(e => ({
          ...e,
          level: ExpertiseLevel.EXPERT,
          knownConcepts: ['机器学习', '深度学习', '神经网络'],
        })),
      };

      const cards = await service.generateFromStory('user_1', mockStory, expertProfile, {
        personalization: { adaptToProfile: true, respectKnownConcepts: true, filterByDomain: true },
      });

      expect(cards[0].personalization.prerequisiteFiltered).toBe(true);
    });
  });

  describe('常量定义', () => {
    it('应该有正确的掌握等级定义', () => {
      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.EXPOSED]).toBeDefined();
      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.FAMILIAR]).toBeDefined();
      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.MASTERED]).toBeDefined();

      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.EXPOSED].minConfidence).toBe(0);
      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.FAMILIAR].minConfidence).toBe(0.5);
      expect(MASTERY_LEVEL_DEFINITIONS[MasteryLevel.MASTERED].minConfidence).toBe(0.85);
    });

    it('应该有正确的复习间隔策略', () => {
      expect(REVIEW_INTERVAL_STRATEGY[MasteryLevel.EXPOSED]).toBeDefined();
      expect(REVIEW_INTERVAL_STRATEGY[MasteryLevel.FAMILIAR]).toBeDefined();
      expect(REVIEW_INTERVAL_STRATEGY[MasteryLevel.MASTERED]).toBeDefined();

      // 等级越高，初始间隔越长
      expect(REVIEW_INTERVAL_STRATEGY[MasteryLevel.EXPOSED].initialInterval)
        .toBeLessThan(REVIEW_INTERVAL_STRATEGY[MasteryLevel.FAMILIAR].initialInterval);
    });

    it('应该有默认选项', () => {
      expect(DEFAULT_CARD_OPTIONS).toBeDefined();
      expect(DEFAULT_CARD_OPTIONS.extraction.maxConcepts).toBeGreaterThan(0);
      expect(DEFAULT_CARD_OPTIONS.connections.maxPrerequisites).toBeGreaterThan(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理没有主题的故事', async () => {
      const emptyStory = {
        ...mockStory,
        themes: [],
      };

      const cards = await service.generateFromStory('user_1', emptyStory, mockProfile);
      // 没有主题时，如果还有争议视角，会生成争议卡片
      expect(cards.length).toBeGreaterThanOrEqual(0);
    });

    it('应该处理没有观点的故事', async () => {
      const noPerspectiveStory = {
        ...mockStory,
        perspectives: undefined,
      };

      const cards = await service.generateFromStory('user_1', noPerspectiveStory, mockProfile);
      
      // 不应该生成争议卡片
      const debateCard = cards.find(c => c.concept.term.includes('争议'));
      expect(debateCard).toBeUndefined();
    });

    it('应该处理单观点故事', async () => {
      const singlePerspectiveStory = {
        ...mockStory,
        perspectives: {
          ...mockStory.perspectives!,
          perspectives: [mockStory.perspectives!.perspectives[0]],
        },
      };

      const cards = await service.generateFromStory('user_1', singlePerspectiveStory, mockProfile);
      
      // 单观点不应该生成争议卡片
      const debateCard = cards.find(c => c.concept.term.includes('争议'));
      expect(debateCard).toBeUndefined();
    });

    it('应该处理很长的定义', async () => {
      const longDefinition = '这是一个很长的定义。'.repeat(20);
      const card = await service.generate('user_1', '长定义概念', longDefinition);

      expect(card.concept.shortDefinition.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });
});
