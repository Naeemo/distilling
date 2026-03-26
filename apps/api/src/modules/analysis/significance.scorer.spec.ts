import { SignificanceScorer } from './significance.scorer';
import {
  SignificanceInput,
  SignificanceLevel,
  UserProfile,
  ContentMetadata,
} from './significance.types';

describe('SignificanceScorer', () => {
  let scorer: SignificanceScorer;

  // 基础测试数据
  const baseUserProfile: UserProfile = {
    userId: 'user-001',
    interestTags: ['人工智能', '区块链', '创业'],
    preferredDomains: ['techcrunch.com', 'github.com'],
    blockedDomains: ['fake-news.xyz'],
  };

  const baseMetadata: ContentMetadata = {
    url: 'https://techcrunch.com/2024/03/20/ai-startup-funding',
    title: 'AI创业公司获得10亿美元融资',
    author: 'TechCrunch',
    publishDate: new Date(),
    sourceDomain: 'techcrunch.com',
    contentType: 'breaking',
    wordCount: 1200,
    tags: ['人工智能', '创业', '融资'],
  };

  const baseContent = {
    title: 'AI创业公司获得10亿美元融资',
    text: '一家人工智能创业公司今天宣布完成10亿美元融资，这是今年最大的一笔AI投资...',
    summary: 'AI创业公司获10亿美元融资',
  };

  beforeEach(() => {
    scorer = new SignificanceScorer();
  });

  describe('basic functionality', () => {
    it('should be defined', () => {
      expect(scorer).toBeDefined();
    });

    it('should have default configuration', () => {
      const config = scorer.getConfig();
      expect(config.weights).toBeDefined();
      expect(config.thresholds).toBeDefined();
      expect(config.domainReputations).toBeDefined();
    });

    it('should return correct weights', () => {
      const weights = scorer.getWeights();
      expect(weights.domainAuthority).toBeGreaterThan(0);
      expect(weights.novelty).toBeGreaterThan(0);
      expect(weights.relevance).toBeGreaterThan(0);
      expect(weights.timeliness).toBeGreaterThan(0);
      
      // 权重总和应为1
      const sum = weights.domainAuthority + weights.novelty + weights.relevance + weights.timeliness;
      expect(sum).toBeCloseTo(1, 2);
    });
  });

  describe('domain authority scoring', () => {
    it('should score authoritative domain high', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'nature.com',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.domainAuthority).toBeGreaterThanOrEqual(0.9);
      expect(result.breakdown.domainAuthority.details.length).toBeGreaterThan(0);
    });

    it('should score reputable domain medium-high', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'techcrunch.com',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.domainAuthority).toBeGreaterThanOrEqual(0.7);
    });

    it('should give bonus for preferred domain', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'github.com',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      // github.com 基础分0.85 + 偏好加分0.1 = 0.95
      expect(result.dimensionScores.domainAuthority).toBeGreaterThanOrEqual(0.9);
      expect(result.breakdown.domainAuthority.details).toContain('用户偏好域名，加分 +0.1');
    });

    it('should score blocked domain as zero', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'fake-news.xyz',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.domainAuthority).toBe(0);
      expect(result.level).toBe('low');
    });

    it('should handle unknown domain with default score', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'unknown-website.com',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.domainAuthority).toBe(0.5);
      expect(result.breakdown.domainAuthority.details).toContain(
        '域名 unknown-website.com 不在信誉库中，使用默认分数'
      );
    });
  });

  describe('novelty scoring', () => {
    it('should score high novelty without reading history', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: {
          ...baseUserProfile,
          readingHistory: [],
        },
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.novelty).toBe(1.0);
      expect(result.breakdown.novelty.details).toContain('无阅读历史，默认为高新颖性');
    });

    it('should detect similar content in history', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: {
          ...baseUserProfile,
          readingHistory: [
            {
              contentId: 'prev-001',
              title: '人工智能创业公司获得新一轮融资',
              tags: ['人工智能', '创业', '融资'],
              readAt: new Date(Date.now() - 86400000), // 1天前
            },
          ],
        },
      };

      const result = scorer.score(input);
      
      // 有相似内容，新颖性应该降低
      expect(result.dimensionScores.novelty).toBeLessThan(1);
      expect(result.breakdown.novelty.details.some(d => d.includes('相似度'))).toBe(true);
    });

    it('should penalize for multiple similar contents', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: {
          ...baseUserProfile,
          readingHistory: [
            {
              contentId: 'prev-001',
              title: 'AI公司融资新闻',
              tags: ['人工智能', '创业'],
              readAt: new Date(Date.now() - 86400000),
            },
            {
              contentId: 'prev-002',
              title: '创业公司融资动态',
              tags: ['创业', '融资'],
              readAt: new Date(Date.now() - 172800000),
            },
            {
              contentId: 'prev-003',
              title: 'AI行业融资报告',
              tags: ['人工智能', '融资'],
              readAt: new Date(Date.now() - 259200000),
            },
          ],
        },
      };

      const result = scorer.score(input);
      
      // 有多篇相似内容，应该有惩罚
      expect(result.dimensionScores.novelty).toBeLessThan(0.8);
      expect(result.breakdown.novelty.details.some(d => d.includes('3'))).toBe(true);
    });
  });

  describe('relevance scoring', () => {
    it('should score high when tags match interest', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      // 标签 ['人工智能', '创业', '融资'] 匹配兴趣 ['人工智能', '区块链', '创业']
      expect(result.dimensionScores.relevance).toBeGreaterThan(0.6);
      expect(result.breakdown.relevance.details.some(d => d.includes('匹配兴趣标签'))).toBe(true);
    });

    it('should score medium when content type matches', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          tags: [], // 无标签
          contentType: '创业', // 匹配兴趣标签
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.relevance).toBeGreaterThan(0.3);
    });

    it('should score low when no interest match', () => {
      const input: SignificanceInput = {
        content: {
          title: '体育明星参加娱乐活动',
          text: '这是一篇关于体育和娱乐的新闻内容',
        },
        metadata: {
          ...baseMetadata,
          tags: ['体育', '娱乐', '明星'],
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.relevance).toBeLessThan(0.4);
    });

    it('should handle no interest tags', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: {
          ...baseUserProfile,
          interestTags: [],
        },
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.relevance).toBe(0.5);
      expect(result.breakdown.relevance.details).toContain('无用户兴趣标签，使用默认相关性');
    });
  });

  describe('timeliness scoring', () => {
    it('should score high for recent breaking news', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: new Date(), // 现在
          contentType: 'breaking',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.timeliness).toBeCloseTo(1, 1);
    });

    it('should reduce score for old breaking news', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2天前
          contentType: 'breaking',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      // 突发新闻超过24小时，应该大幅降低
      expect(result.dimensionScores.timeliness).toBeLessThan(0.5);
    });

    it('should use appropriate half-life for different content types', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const researchInput: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: threeDaysAgo,
          contentType: 'research',
        },
        userProfile: baseUserProfile,
      };

      const breakingInput: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: threeDaysAgo,
          contentType: 'breaking',
        },
        userProfile: baseUserProfile,
      };

      const researchResult = scorer.score(researchInput);
      const breakingResult = scorer.score(breakingInput);

      // 研究论文半衰期长，3天后分数应该还较高
      expect(researchResult.dimensionScores.timeliness).toBeGreaterThan(0.8);
      
      // 突发新闻半衰期短，3天后分数应该很低
      expect(breakingResult.dimensionScores.timeliness).toBeLessThan(0.3);
    });

    it('should return zero for expired content', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100天前
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.timeliness).toBe(0);
      expect(result.breakdown.timeliness.details.some(d => d.includes('过期'))).toBe(true);
    });

    it('should handle no publish date', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          publishDate: undefined,
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      expect(result.dimensionScores.timeliness).toBe(0.5);
      expect(result.breakdown.timeliness.details).toContain('无发布日期，使用默认时效性');
    });
  });

  describe('overall scoring', () => {
    it('should calculate final score correctly', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: baseMetadata,
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);

      // 验证得分范围
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);

      // 验证维度得分存在
      expect(result.dimensionScores.domainAuthority).toBeDefined();
      expect(result.dimensionScores.novelty).toBeDefined();
      expect(result.dimensionScores.relevance).toBeDefined();
      expect(result.dimensionScores.timeliness).toBeDefined();

      // 验证等级
      expect(['high', 'medium', 'low']).toContain(result.level);
    });

    it('should score high for perfect content', () => {
      const input: SignificanceInput = {
        content: {
          title: 'Nature: 突破性AI研究',
          text: '最新研究表明...',
        },
        metadata: {
          url: 'https://nature.com/article',
          title: 'Nature: 突破性AI研究',
          sourceDomain: 'nature.com',
          contentType: 'research',
          publishDate: new Date(),
          tags: ['人工智能', '研究'],
        },
        userProfile: {
          userId: 'user-001',
          interestTags: ['人工智能', '研究'],
          preferredDomains: ['nature.com'],
        },
      };

      const result = scorer.score(input);
      
      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('should score low for poor content', () => {
      const input: SignificanceInput = {
        content: {
          title: '震惊！99%的人都不知道',
          text: '点击了解更多...',
        },
        metadata: {
          url: 'https://fake-news.xyz/article',
          title: '震惊！99%的人都不知道',
          sourceDomain: 'fake-news.xyz',
          contentType: 'noise',
          publishDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          tags: ['娱乐'],
        },
        userProfile: {
          userId: 'user-001',
          interestTags: ['科技'],
          blockedDomains: ['fake-news.xyz'],
        },
      };

      const result = scorer.score(input);
      
      expect(result.level).toBe('low');
      expect(result.score).toBeLessThan(0.4);
    });
  });

  describe('level determination', () => {
    it('should classify as high when score >= 0.7', () => {
      // 使用高权威性域名、匹配兴趣、新发布
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'nature.com',
          publishDate: new Date(),
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);
      
      if (result.score >= 0.7) {
        expect(result.level).toBe('high');
        expect(result.recommendations).toContain('高重要性内容，建议优先阅读');
      }
    });

    it('should classify as medium when 0.4 <= score < 0.7', () => {
      // 使用中等条件
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'example.com', // 未知域名，默认0.5
          publishDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一周前
        },
        userProfile: {
          ...baseUserProfile,
          interestTags: ['人工智能'], // 部分匹配
        },
      };

      const result = scorer.score(input);
      
      if (result.score >= 0.4 && result.score < 0.7) {
        expect(result.level).toBe('medium');
        expect(result.recommendations).toContain('可以考虑进一步阅读');
      }
    });

    it('should classify as low when score < 0.4', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'fake-news.xyz', // 被屏蔽
          publishDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 过期
        },
        userProfile: {
          ...baseUserProfile,
          interestTags: ['体育'], // 不匹配
        },
      };

      const result = scorer.score(input);
      
      expect(result.level).toBe('low');
      expect(result.recommendations?.length).toBeGreaterThan(0);
    });
  });

  describe('recommendations', () => {
    it('should provide recommendations for low significance', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'unknown.com',
          publishDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        userProfile: {
          ...baseUserProfile,
          interestTags: ['体育'],
        },
      };

      const result = scorer.score(input);

      if (result.level === 'low') {
        expect(result.recommendations?.length).toBeGreaterThan(0);
        // 可能包含的改进建议
        const possibleRecommendations = [
          '考虑从更权威的来源获取信息',
          '该内容可能与已有知识重复',
          '与用户兴趣相关性较低',
          '内容时效性较差，可能已过时',
        ];
        expect(
          result.recommendations?.some(r => 
            possibleRecommendations.includes(r)
          )
        ).toBe(true);
      }
    });
  });

  describe('batch scoring', () => {
    it('should score multiple contents', () => {
      const inputs: SignificanceInput[] = [
        {
          content: baseContent,
          metadata: {
            ...baseMetadata,
            sourceDomain: 'nature.com',
          },
          userProfile: baseUserProfile,
        },
        {
          content: baseContent,
          metadata: {
            ...baseMetadata,
            sourceDomain: 'techcrunch.com',
          },
          userProfile: baseUserProfile,
        },
        {
          content: baseContent,
          metadata: {
            ...baseMetadata,
            sourceDomain: 'fake-news.xyz',
          },
          userProfile: baseUserProfile,
        },
      ];

      const results = scorer.scoreBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].dimensionScores.domainAuthority).toBeGreaterThan(
        results[1].dimensionScores.domainAuthority
      );
      expect(results[2].dimensionScores.domainAuthority).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('should update weights', () => {
      const newWeights = {
        domainAuthority: 0.5,
        novelty: 0.2,
        relevance: 0.2,
        timeliness: 0.1,
      };

      scorer.updateWeights(newWeights);
      const weights = scorer.getWeights();

      expect(weights.domainAuthority).toBeCloseTo(0.5, 10);
      expect(weights.novelty).toBeCloseTo(0.2, 10);
    });

    it('should maintain weight sum after partial update', () => {
      scorer.updateWeights({ domainAuthority: 0.5 });
      const weights = scorer.getWeights();

      const sum = weights.domainAuthority + weights.novelty + weights.relevance + weights.timeliness;
      expect(sum).toBeCloseTo(1, 2);
    });

    it('should add and remove domain reputation', () => {
      scorer.addDomainReputation('test-domain.com', {
        score: 0.8,
        category: 'reputable',
        description: '测试域名',
      });

      const reputation = scorer.getDomainReputation('test-domain.com');
      expect(reputation?.score).toBe(0.8);
      expect(reputation?.category).toBe('reputable');

      scorer.removeDomainReputation('test-domain.com');
      expect(scorer.getDomainReputation('test-domain.com')).toBeUndefined();
    });

    it('should handle custom configuration', () => {
      const customScorer = new SignificanceScorer({
        thresholds: {
          high: 0.8,
          medium: 0.5,
          low: 0,
        },
        domainReputations: {
          'custom-domain.com': {
            score: 0.99,
            category: 'authoritative',
          },
        },
      });

      const config = customScorer.getConfig();
      expect(config.thresholds.high).toBe(0.8);
      expect(config.domainReputations['custom-domain.com']?.score).toBe(0.99);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const input: SignificanceInput = {
        content: {
          title: '',
          text: '',
        },
        metadata: {
          url: 'https://example.com',
          title: '',
          sourceDomain: 'example.com',
          contentType: 'article',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);

      expect(result.score).toBeDefined();
      expect(result.level).toBeDefined();
    });

    it('should handle special characters in domain', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'www.nature.com', // 带www前缀
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);

      // 应该能正确匹配到 nature.com
      expect(result.dimensionScores.domainAuthority).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle uppercase domains', () => {
      const input: SignificanceInput = {
        content: baseContent,
        metadata: {
          ...baseMetadata,
          sourceDomain: 'NATURE.COM',
        },
        userProfile: baseUserProfile,
      };

      const result = scorer.score(input);

      expect(result.dimensionScores.domainAuthority).toBeGreaterThanOrEqual(0.9);
    });
  });
});
