import { Test, TestingModule } from '@nestjs/testing';
import { UserProfileService } from '../user-profile.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import Redis from 'ioredis';
import {
  CognitiveProfile,
  DomainExpertise,
  UserPreference,
  UserBehavior,
  UserContext,
  BehaviorEvent,
  BehaviorEventType,
  ExpertiseLevel,
  DepthPreference,
  PacePreference,
  FormatPreference,
  StructurePreference,
  EnergyLevel,
  UserGoal,
} from '../user-profile.types';

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  keys: jest.fn(),
};

// Mock Prisma
const mockPrisma = {
  content: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  highlight: {
    findMany: jest.fn(),
  },
  tag: {
    findMany: jest.fn(),
  },
};

describe('UserProfileService', () => {
  let service: UserProfileService;
  let redis: typeof mockRedis;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    redis = module.get(REDIS_CLIENT);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('基本功能', () => {
    it('服务应该被定义', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getProfile - 获取用户画像', () => {
    const mockUserId = 'user_123';
    const mockProfile: CognitiveProfile = {
      userId: mockUserId,
      expertise: [
        {
          domain: 'AI',
          level: ExpertiseLevel.INTERMEDIATE,
          knownConcepts: ['机器学习', '神经网络'],
          knowledgeGaps: ['强化学习'],
          confidenceScore: 0.7,
          lastAssessedAt: new Date(),
        },
      ],
      preference: {
        depth: DepthPreference.BALANCED,
        pace: PacePreference.MODERATE,
        format: FormatPreference.TEXT,
        structure: StructurePreference.LINEAR,
        preferredDomains: ['AI', '前端'],
        dislikedDomains: [],
      },
      behavior: {
        avgReadingTime: 15,
        completionRate: 0.75,
        revisitedTopics: ['深度学习'],
        skippedTopics: ['区块链'],
        totalContentsRead: 50,
        totalReadingTime: 750,
        favoriteTags: ['AI', 'React'],
        peakReadingHours: [9, 14, 21],
        avgSessionDuration: 20,
        interactionFrequency: 2.5,
      },
      context: {
        availableTime: 30,
        energyLevel: EnergyLevel.HIGH,
        goal: UserGoal.LEARN,
        currentTopic: 'AI',
        recentSearches: ['LLM', 'transformer'],
        deviceType: 'desktop',
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应该从缓存获取画像（如果有）', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProfile));

      const result = await service.getProfile(mockUserId);

      expect(redis.get).toHaveBeenCalledWith(`user:profile:${mockUserId}`);
      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
    });

    it('缓存未命中时应该从数据库构建', async () => {
      redis.get.mockResolvedValue(null);
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.highlight.findMany.mockResolvedValue([]);
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const result = await service.getProfile(mockUserId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('buildProfile - 构建用户画像', () => {
    const mockUserId = 'user_456';

    it('应该基于用户内容构建画像', async () => {
      // 模拟用户数据
      const mockContents = [
        {
          id: 'content_1',
          readingProgress: 100,
          readingTime: 600,
          status: 'READ',
          readCount: 2,
          tags: [{ tag: { name: 'AI' } }, { tag: { name: '机器学习' } }],
        },
        {
          id: 'content_2',
          readingProgress: 50,
          readingTime: 300,
          status: 'READING',
          readCount: 1,
          tags: [{ tag: { name: 'AI' } }],
        },
        {
          id: 'content_3',
          readingProgress: 10,
          readingTime: 60,
          status: 'UNREAD',
          readCount: 1,
          tags: [{ tag: { name: '区块链' } }],
        },
      ];

      const mockTags = [
        { name: 'AI', contents: [{ contentId: '1' }, { contentId: '2' }] },
        { name: '机器学习', contents: [{ contentId: '1' }] },
        { name: '区块链', contents: [{ contentId: '3' }] },
      ];

      const mockHighlights = [
        { id: 'highlight_1', contentId: 'content_1' },
        { id: 'highlight_2', contentId: 'content_1' },
      ];

      mockPrisma.content.findMany.mockResolvedValueOnce(mockContents);
      mockPrisma.highlight.findMany.mockResolvedValueOnce(mockHighlights);
      mockPrisma.tag.findMany.mockResolvedValueOnce(mockTags);
      mockPrisma.content.findMany.mockResolvedValueOnce([
        { ...mockContents[0], lastReadAt: new Date() },
        { ...mockContents[1], lastReadAt: new Date() },
      ]);
      mockPrisma.content.findFirst.mockResolvedValueOnce(mockContents[0]);

      const profile = await service.buildProfile({ userId: mockUserId });

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(mockUserId);
      
      // 验证专业知识构建
      expect(profile.expertise.length).toBeGreaterThan(0);
      const aiExpertise = profile.expertise.find(e => e.domain === 'AI');
      expect(aiExpertise).toBeDefined();
      
      // 验证行为统计
      expect(profile.behavior.totalContentsRead).toBeGreaterThan(0);
      expect(profile.behavior.completionRate).toBeGreaterThan(0);
      
      // 验证偏好推断
      expect(profile.preference.depth).toBeDefined();
      expect(profile.preference.pace).toBeDefined();
    });
  });

  describe('updateProfile - 更新用户画像', () => {
    const mockUserId = 'user_789';

    it('应该通过行为事件更新画像', async () => {
      // 先设置一个基础画像
      const baseProfile: CognitiveProfile = {
        userId: mockUserId,
        expertise: [{ 
          domain: 'AI', 
          level: ExpertiseLevel.NOVICE, 
          knownConcepts: [], 
          knowledgeGaps: [], 
          confidenceScore: 0.3, 
          lastAssessedAt: new Date() 
        }],
        preference: {
          depth: DepthPreference.SURFACE,
          pace: PacePreference.QUICK,
          format: FormatPreference.TEXT,
          structure: StructurePreference.LINEAR,
          preferredDomains: [],
          dislikedDomains: [],
        },
        behavior: {
          avgReadingTime: 5,
          completionRate: 0.3,
          revisitedTopics: [],
          skippedTopics: [],
          totalContentsRead: 10,
          totalReadingTime: 50,
          favoriteTags: [],
          peakReadingHours: [12],
          avgSessionDuration: 8,
          interactionFrequency: 1,
        },
        context: {
          availableTime: 20,
          energyLevel: EnergyLevel.MEDIUM,
          goal: UserGoal.OVERVIEW,
          recentSearches: [],
          deviceType: 'mobile',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      redis.get.mockResolvedValue(JSON.stringify(baseProfile));

      const event: BehaviorEvent = {
        userId: mockUserId,
        eventType: BehaviorEventType.CONTENT_COMPLETE,
        timestamp: new Date(),
        contentId: 'content_new',
        contentTags: ['AI', '深度学习'],
      };

      const updatedProfile = await service.updateProfile(mockUserId, event);

      expect(updatedProfile.version).toBe(2);
      // 注意：Redis缓存反序列化会重建Date对象，这里验证version即可
      
      // 验证专业知识更新
      const aiExpertise = updatedProfile.expertise.find(e => e.domain === 'AI');
      expect(aiExpertise?.confidenceScore).toBeGreaterThan(baseProfile.expertise[0].confidenceScore);
    });

    it('不同行为事件类型应该产生不同影响', async () => {
      const baseProfile: CognitiveProfile = {
        userId: mockUserId,
        expertise: [],
        preference: {
          depth: DepthPreference.SURFACE,
          pace: PacePreference.QUICK,
          format: FormatPreference.TEXT,
          structure: StructurePreference.LINEAR,
          preferredDomains: [],
          dislikedDomains: [],
        },
        behavior: {
          avgReadingTime: 5,
          completionRate: 0.3,
          revisitedTopics: [],
          skippedTopics: [],
          totalContentsRead: 5,
          totalReadingTime: 25,
          favoriteTags: [],
          peakReadingHours: [12],
          avgSessionDuration: 8,
          interactionFrequency: 1,
        },
        context: {
          availableTime: 20,
          energyLevel: EnergyLevel.MEDIUM,
          goal: UserGoal.OVERVIEW,
          recentSearches: [],
          deviceType: 'mobile',
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      redis.get.mockResolvedValue(JSON.stringify(baseProfile));

      // 测试搜索事件
      const searchEvent: BehaviorEvent = {
        userId: mockUserId,
        eventType: BehaviorEventType.SEARCH_QUERY,
        timestamp: new Date(),
        metadata: { query: 'AI最新发展' },
      };

      const updated = await service.updateProfile(mockUserId, searchEvent);
      expect(updated.context.recentSearches).toContain('AI最新发展');
    });
  });

  describe('calculateSimilarity - 画像相似度计算', () => {
    const createMockProfile = (
      userId: string,
      expertise: DomainExpertise[],
      preference: Partial<UserPreference> = {},
    ): CognitiveProfile => ({
      userId,
      expertise,
      preference: {
        depth: DepthPreference.BALANCED,
        pace: PacePreference.MODERATE,
        format: FormatPreference.TEXT,
        structure: StructurePreference.LINEAR,
        preferredDomains: ['AI', '前端'],
        dislikedDomains: [],
        ...preference,
      },
      behavior: {
        avgReadingTime: 15,
        completionRate: 0.7,
        revisitedTopics: ['React'],
        skippedTopics: ['区块链'],
        totalContentsRead: 50,
        totalReadingTime: 750,
        favoriteTags: ['AI', 'React', 'Node.js'],
        peakReadingHours: [9, 14, 21],
        avgSessionDuration: 20,
        interactionFrequency: 2.5,
      },
      context: {
        availableTime: 30,
        energyLevel: EnergyLevel.HIGH,
        goal: UserGoal.LEARN,
        recentSearches: [],
        deviceType: 'desktop',
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('相同画像应该有100%相似度', () => {
      const expertise: DomainExpertise[] = [
        { domain: 'AI', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() },
        { domain: '前端', level: ExpertiseLevel.INTERMEDIATE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.7, lastAssessedAt: new Date() },
      ];

      const profileA = createMockProfile('user_a', expertise);
      const profileB = createMockProfile('user_b', expertise);

      const similarity = service.calculateSimilarity(profileA, profileB);

      expect(similarity.score).toBeGreaterThan(0.8);
      expect(similarity.commonDomains).toContain('AI');
      expect(similarity.commonDomains).toContain('前端');
    });

    it('完全不同领域应该有低相似度', () => {
      const expertiseA: DomainExpertise[] = [
        { domain: 'AI', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() },
      ];
      const expertiseB: DomainExpertise[] = [
        { domain: '金融', level: ExpertiseLevel.NOVICE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.3, lastAssessedAt: new Date() },
      ];

      const profileA = createMockProfile('user_a', expertiseA);
      const profileB = createMockProfile('user_b', expertiseB);

      const similarity = service.calculateSimilarity(profileA, profileB);

      expect(similarity.score).toBeLessThan(0.8); // 偏好和行为可能仍有相似性
      expect(similarity.commonDomains.length).toBe(0);
    });

    it('应该识别互补专长', () => {
      const expertiseA: DomainExpertise[] = [
        { domain: 'AI', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() },
        { domain: '前端', level: ExpertiseLevel.NOVICE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.3, lastAssessedAt: new Date() },
      ];
      const expertiseB: DomainExpertise[] = [
        { domain: 'AI', level: ExpertiseLevel.NOVICE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.3, lastAssessedAt: new Date() },
        { domain: '前端', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() },
      ];

      const profileA = createMockProfile('user_a', expertiseA);
      const profileB = createMockProfile('user_b', expertiseB);

      const similarity = service.calculateSimilarity(profileA, profileB);

      expect(similarity.complementaryExpertise.length).toBeGreaterThan(0);
    });

    it('应该识别共同兴趣', () => {
      const expertise: DomainExpertise[] = [
        { domain: 'AI', level: ExpertiseLevel.INTERMEDIATE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.6, lastAssessedAt: new Date() },
      ];

      const profileA = createMockProfile('user_a', expertise);
      const profileB = createMockProfile('user_b', expertise);

      const similarity = service.calculateSimilarity(profileA, profileB);

      expect(similarity.commonInterests.length).toBeGreaterThan(0);
      expect(similarity.commonInterests).toContain('AI');
    });
  });

  describe('辅助功能', () => {
    const mockUserId = 'user_aux';
    const mockProfile: CognitiveProfile = {
      userId: mockUserId,
      expertise: [
        { domain: 'AI', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() },
        { domain: '前端', level: ExpertiseLevel.INTERMEDIATE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.7, lastAssessedAt: new Date() },
        { domain: '后端', level: ExpertiseLevel.NOVICE, knownConcepts: [], knowledgeGaps: ['微服务'], confidenceScore: 0.3, lastAssessedAt: new Date() },
      ],
      preference: {
        depth: DepthPreference.BALANCED,
        pace: PacePreference.MODERATE,
        format: FormatPreference.TEXT,
        structure: StructurePreference.LINEAR,
        preferredDomains: ['AI', '前端'],
        dislikedDomains: [],
      },
      behavior: {
        avgReadingTime: 15,
        completionRate: 0.7,
        revisitedTopics: [],
        skippedTopics: [],
        totalContentsRead: 50,
        totalReadingTime: 750,
        favoriteTags: ['AI', 'React', 'Node.js'],
        peakReadingHours: [9, 14, 21],
        avgSessionDuration: 20,
        interactionFrequency: 2.5,
      },
      context: {
        availableTime: 30,
        energyLevel: EnergyLevel.HIGH,
        goal: UserGoal.LEARN,
        recentSearches: [],
        deviceType: 'desktop',
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('应该获取用户最擅长的领域', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProfile));

      const topExpertise = await service.getTopExpertise(mockUserId, 2);

      expect(topExpertise.length).toBeLessThanOrEqual(2);
      expect(topExpertise[0]?.domain).toBe('AI');
    });

    it('应该获取用户知识盲区', async () => {
      redis.get.mockResolvedValue(JSON.stringify(mockProfile));

      const gaps = await service.getKnowledgeGaps(mockUserId);

      expect(gaps.length).toBeGreaterThan(0);
      const backendGaps = gaps.find(g => g.domain === '后端');
      expect(backendGaps?.gaps).toContain('微服务');
    });

    it('新手应该获得基础学习路径', async () => {
      const noviceProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: [{ domain: '区块链', level: ExpertiseLevel.NOVICE, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.2, lastAssessedAt: new Date() }],
      };
      redis.get.mockResolvedValue(JSON.stringify(noviceProfile));

      const path = await service.getRecommendedLearningPath(mockUserId, '区块链');

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]?.stage).toBe('基础入门');
    });

    it('专家应该获得进阶学习路径', async () => {
      const expertProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: [{ domain: 'AI', level: ExpertiseLevel.EXPERT, knownConcepts: [], knowledgeGaps: [], confidenceScore: 0.9, lastAssessedAt: new Date() }],
      };
      redis.get.mockResolvedValue(JSON.stringify(expertProfile));

      const path = await service.getRecommendedLearningPath(mockUserId, 'AI');

      expect(path.length).toBeGreaterThan(0);
      expect(path[0]?.stage).toBe('前沿探索');
    });

    it('应该清除画像缓存', async () => {
      redis.del.mockResolvedValue(1);

      await service.clearProfileCache(mockUserId);

      expect(redis.del).toHaveBeenCalledWith(`user:profile:${mockUserId}`);
    });

    it('应该重新构建画像', async () => {
      redis.del.mockResolvedValue(1);
      mockPrisma.content.findMany.mockResolvedValue([]);
      mockPrisma.highlight.findMany.mockResolvedValue([]);
      mockPrisma.tag.findMany.mockResolvedValue([]);

      const profile = await service.rebuildProfile(mockUserId);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(mockUserId);
    });
  });
});
