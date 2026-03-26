import { Test, TestingModule } from '@nestjs/testing';
import { SmartSummaryService } from '../smart-summary.service';
import {
  SmartSummary,
  SummaryOptions,
  NarrativeStructure,
  SummaryLevel,
  DEFAULT_SUMMARY_OPTIONS,
} from '../smart-summary.types';
import {
  AggregatedStory,
  ThemeCluster,
  PerspectiveComparison,
  CredibilityAssessment,
} from '../content-aggregator.types';
import { CognitiveProfile, ExpertiseLevel, UserGoal, DepthPreference, PacePreference, FormatPreference, StructurePreference, EnergyLevel } from '../user-profile.types';

describe('SmartSummaryService', () => {
  let service: SmartSummaryService;

  // 测试数据 - 模拟聚合故事
  const mockStory: AggregatedStory = {
    id: 'story_1',
    userId: 'user_1',
    title: 'AI发展现状与争议',
    summary: '人工智能领域近期发展迅速，但也引发诸多争议',
    themes: [
      {
        id: 'theme_1',
        name: 'AI技术突破',
        description: '大语言模型和生成式AI的技术进展',
        keywords: ['AI', 'GPT', '生成式AI'],
        contents: [
          {
            contentId: 'content_1',
            title: 'GPT-4革命性突破',
            relevanceScore: 0.95,
            excerpt: 'GPT-4展现了强大的多模态理解能力',
            keyPoints: ['多模态理解', '推理能力提升', '应用场景扩展'],
          },
          {
            contentId: 'content_2',
            title: 'Gemini挑战OpenAI',
            relevanceScore: 0.88,
            excerpt: '谷歌Gemini在多项测试中与GPT-4竞争',
            keyPoints: ['性能对比', '市场竞争', '技术路线'],
          },
        ],
        summary: 'AI大模型技术正在快速迭代，各大公司竞争激烈',
        centroid: [0.9, 0.8, 0.85],
        cohesion: 0.92,
      },
      {
        id: 'theme_2',
        name: 'AI安全争议',
        description: '关于AI安全性和监管的讨论',
        keywords: ['AI安全', '监管', '风险'],
        contents: [
          {
            contentId: 'content_3',
            title: 'AI安全警告',
            relevanceScore: 0.9,
            excerpt: '专家警告AI发展可能带来不可控风险',
            keyPoints: ['安全风险', '监管需求', '伦理问题'],
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
          mainArgument: 'AI技术发展将带来巨大经济和社会效益，应该鼓励创新',
          keyClaims: ['AI提升生产力', '创造新就业机会', '改善生活质量'],
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
          keyClaims: ['存在未知风险', '需要监管框架', '应优先安全'],
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
      consensusAreas: ['AI技术重要性', '需要持续研究'],
      debateAreas: ['监管强度', '发展速度'],
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
        {
          id: 'event_2',
          contentId: 'content_3',
          title: 'AI安全警告',
          eventDate: new Date('2024-03-20'),
          datePrecision: 'exact',
          description: '专家发布AI安全警告',
          significance: 'major',
          relatedEvents: ['event_1'],
          sourceContext: '专家联名信警告AI风险',
        },
      ],
      phases: [
        {
          name: '发布期',
          description: 'GPT-4发布引发关注',
          startDate: new Date('2024-03-15'),
          endDate: new Date('2024-03-20'),
          events: ['event_1'],
        },
      ],
      span: {
        start: new Date('2024-03-15'),
        end: new Date('2024-03-20'),
      },
    },
    credibilityMap: [
      {
        contentId: 'content_1',
        overallScore: 0.9,
        dimensions: {
          sourceAuthority: 0.95,
          factualConsistency: 0.9,
          evidenceSupport: 0.85,
          transparency: 0.9,
          recency: 0.95,
        },
        redFlags: [],
        strengths: ['权威来源', '数据详实'],
        crossVerification: {
          verifiedClaims: 3,
          disputedClaims: 0,
          unverifiedClaims: 1,
        },
      },
      {
        contentId: 'content_2',
        overallScore: 0.8,
        dimensions: {
          sourceAuthority: 0.85,
          factualConsistency: 0.8,
          evidenceSupport: 0.75,
          transparency: 0.8,
          recency: 0.85,
        },
        redFlags: [],
        strengths: ['多视角分析'],
        crossVerification: {
          verifiedClaims: 2,
          disputedClaims: 1,
          unverifiedClaims: 1,
        },
      },
      {
        contentId: 'content_3',
        overallScore: 0.75,
        dimensions: {
          sourceAuthority: 0.8,
          factualConsistency: 0.75,
          evidenceSupport: 0.7,
          transparency: 0.75,
          recency: 0.8,
        },
        redFlags: ['观点偏负面'],
        strengths: ['专家观点'],
        crossVerification: {
          verifiedClaims: 2,
          disputedClaims: 0,
          unverifiedClaims: 2,
        },
      },
    ] as CredibilityAssessment[],
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
        knownConcepts: ['机器学习', '深度学习', '神经网络'],
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
      dislikedDomains: ['marketing'],
    },
    behavior: {
      avgReadingTime: 300,
      completionRate: 0.75,
      revisitedTopics: ['AI', '技术趋势'],
      skippedTopics: ['营销'],
      totalContentsRead: 100,
      totalReadingTime: 5000,
      favoriteTags: ['AI', '技术', '编程'],
      peakReadingHours: [9, 14, 20],
      avgSessionDuration: 25,
      interactionFrequency: 5,
    },
    context: {
      availableTime: 15,
      energyLevel: EnergyLevel.HIGH,
      goal: UserGoal.LEARN,
      currentTopic: 'AI发展',
      recentSearches: ['GPT-4', 'Gemini'],
      deviceType: 'desktop',
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartSummaryService],
    }).compile();

    service = module.get<SmartSummaryService>(SmartSummaryService);
  });

  describe('生成智能摘要', () => {
    it('应该成功生成三级摘要', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe('user_1');
      expect(result.aggregatedStoryId).toBe(mockStory.id);

      // 验证30秒阅读层
      expect(result.insight).toBeDefined();
      expect(result.insight.headline).toBeTruthy();
      expect(result.insight.keyPoint).toBeTruthy();
      expect(result.insight.implication).toBeTruthy();
      expect(result.insight.readTime).toBeGreaterThan(0);

      // 验证2分钟阅读层
      expect(result.summary).toBeDefined();
      expect(result.summary.context).toBeTruthy();
      expect(result.summary.development).toBeTruthy();
      expect(result.summary.keyTakeaways.length).toBeGreaterThan(0);

      // 验证深度阅读层
      expect(result.narrative).toBeDefined();
      expect(result.narrative.structure).toBeDefined();
      expect(result.narrative.sections.length).toBeGreaterThan(0);
      expect(result.narrative.references.length).toBeGreaterThan(0);
    });

    it('应该支持自定义选项', async () => {
      const options: Partial<SummaryOptions> = {
        levels: {
          insight: true,
          summary: false,
          narrative: false,
        },
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      expect(result.insight.headline).toBeTruthy();
      expect(result.summary.context).toBe('');
      expect(result.narrative.sections).toEqual([]);
    });

    it('应该在没有用户画像时正常工作', async () => {
      const result = await service.generate('user_1', mockStory);

      expect(result).toBeDefined();
      expect(result.insight.headline).toBeTruthy();
      expect(result.narrative.sections.length).toBeGreaterThan(0);
      expect(result.personalization.difficultyLevel).toBe('intermediate');
    });
  });

  describe('叙事结构选择', () => {
    it('应该为争议话题选择对比结构', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);
      
      // 有争议的话题应该选择对比或弧线结构
      expect([NarrativeStructure.COMPARE, NarrativeStructure.ARC]).toContain(
        result.narrative.structure
      );
    });

    it('应该支持强制指定结构', async () => {
      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.PYRAMID,
        autoStructure: { enabled: false, basedOn: [] },
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      expect(result.narrative.structure).toBe(NarrativeStructure.PYRAMID);
    });

    it('应该根据用户目标选择结构', async () => {
      const decisionProfile: CognitiveProfile = {
        ...mockProfile,
        context: {
          ...mockProfile.context,
          goal: UserGoal.DECISION,
        },
      };

      const result = await service.generate('user_1', mockStory, decisionProfile);

      // 决策目标偏好对比结构
      expect([NarrativeStructure.COMPARE, NarrativeStructure.QA]).toContain(
        result.narrative.structure
      );
    });
  });

  describe('30秒阅读层 (Insight)', () => {
    it('应该生成吸引人的 headline', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.insight.headline.length).toBeGreaterThan(10);
      expect(result.insight.headline.length).toBeLessThan(100);
      // 应该包含主题名称
      expect(result.insight.headline).toContain('AI');
    });

    it('headline应该反映内容紧急程度', async () => {
      const urgentStory = {
        ...mockStory,
        meta: {
          ...mockStory.meta,
          dateRange: {
            start: new Date(),
            end: new Date(),
          },
        },
      };

      const result = await service.generate('user_1', urgentStory, mockProfile);

      // 紧急内容应该包含提示
      expect(result.insight.headline.length).toBeGreaterThan(0);
    });

    it('应该生成有针对性的影响说明', async () => {
      const techProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: mockProfile.expertise.map(e => ({ ...e, domain: 'tech' })),
      };

      const result = await service.generate('user_1', mockStory, techProfile);

      expect(result.insight.implication).toContain('技术');
    });
  });

  describe('2分钟阅读层 (Summary)', () => {
    it('应该包含背景介绍', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.summary.context).toContain('AI');
      expect(result.summary.context).toContain('3'); // sourceCount
    });

    it('应该包含有发展的关键内容', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.summary.development.length).toBeGreaterThan(0);
      expect(result.summary.development).toContain('GPT');
    });

    it('应该包含多视角摘要', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.summary.perspectives.length).toBeGreaterThan(0);
      expect(result.summary.perspectives[0].mainPoint).toBeTruthy();
      expect(result.summary.perspectives[0].stance).toBeDefined();
    });

    it('应该提取关键要点', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.summary.keyTakeaways.length).toBeGreaterThan(0);
      expect(result.summary.keyTakeaways.length).toBeLessThanOrEqual(5);
    });
  });

  describe('深度阅读层 (Narrative)', () => {
    it('应该生成合理的段落结构', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.narrative.sections.length).toBeGreaterThanOrEqual(3);
      expect(result.narrative.sections.length).toBeLessThanOrEqual(8);

      // 检查段落顺序
      result.narrative.sections.forEach((section, index) => {
        expect(section.order).toBe(index + 1);
      });
    });

    it('倒金字塔结构应该正确排序', async () => {
      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.PYRAMID,
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      expect(result.narrative.structure).toBe(NarrativeStructure.PYRAMID);
      
      const sections = result.narrative.sections;
      expect(sections[0].type).toBe('hook'); // 最重要
      expect(sections[sections.length - 1].type).toBe('context'); // 背景
    });

    it('对比结构应该展示双方观点', async () => {
      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.COMPARE,
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      const sectionTypes = result.narrative.sections.map(s => s.type);
      expect(sectionTypes).toContain('comparison_a');
      expect(sectionTypes).toContain('comparison_b');
    });

    it('问答结构应该有问题和答案', async () => {
      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.QA,
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      const sectionTypes = result.narrative.sections.map(s => s.type);
      expect(sectionTypes).toContain('question');
      expect(sectionTypes).toContain('answer');
    });

    it('时间线结构应该按时间排序', async () => {
      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.CHRONOLOGY,
      };

      const result = await service.generate('user_1', mockStory, mockProfile, options);

      expect(result.narrative.structure).toBe(NarrativeStructure.CHRONOLOGY);
      
      // 至少有一个发展段落(时间事件)
      const developmentSections = result.narrative.sections.filter(s => s.type === 'development');
      expect(developmentSections.length).toBeGreaterThan(0);
    });
  });

  describe('摘要预览', () => {
    it('应该生成摘要预览', async () => {
      const preview = await service.preview(mockStory, mockProfile);

      expect(preview.id).toBeDefined();
      expect(preview.title).toBe(mockStory.title);
      expect(preview.availableLevels).toContain(SummaryLevel.INSIGHT);
      expect(preview.availableLevels).toContain(SummaryLevel.SUMMARY);
      expect(preview.availableLevels).toContain(SummaryLevel.NARRATIVE);
    });

    it('应该推荐合适的阅读级别', async () => {
      // 研究目标应该推荐深度阅读
      const researchProfile: CognitiveProfile = {
        ...mockProfile,
        context: {
          ...mockProfile.context,
          goal: UserGoal.RESEARCH,
        },
      };

      const preview = await service.preview(mockStory, researchProfile);
      expect(preview.recommendedLevel).toBe(SummaryLevel.NARRATIVE);
    });

    it('时间紧张时应该推荐简短阅读', async () => {
      const busyProfile: CognitiveProfile = {
        ...mockProfile,
        context: {
          ...mockProfile.context,
          availableTime: 0.5,
        },
      };

      const preview = await service.preview(mockStory, busyProfile);
      expect(preview.recommendedLevel).toBe(SummaryLevel.INSIGHT);
    });
  });

  describe('质量评估', () => {
    it('应该评估摘要质量', async () => {
      const summary = await service.generate('user_1', mockStory, mockProfile);
      const quality = await service.evaluateQuality(summary, mockStory);

      expect(quality.summaryId).toBe(summary.id);
      expect(quality.scores.completeness).toBeGreaterThanOrEqual(0);
      expect(quality.scores.completeness).toBeLessThanOrEqual(1);
      expect(quality.scores.accuracy).toBeGreaterThanOrEqual(0);
      expect(quality.scores.coherence).toBeGreaterThanOrEqual(0);
      expect(quality.scores.conciseness).toBeGreaterThanOrEqual(0);
      expect(quality.scores.engagement).toBeGreaterThanOrEqual(0);
    });

    it('应该识别覆盖情况', async () => {
      const summary = await service.generate('user_1', mockStory, mockProfile);
      const quality = await service.evaluateQuality(summary, mockStory);

      expect(quality.coverage.themesTotal).toBe(mockStory.themes.length);
      expect(quality.coverage.perspectivesTotal).toBe(
        mockStory.perspectives?.perspectives.length || 0
      );
    });
  });

  describe('个性化适配', () => {
    it('应该为新手调整难度', async () => {
      const noviceProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: mockProfile.expertise.map(e => ({ ...e, level: ExpertiseLevel.NOVICE })),
      };

      const result = await service.generate('user_1', mockStory, noviceProfile);

      expect(result.personalization.difficultyLevel).toBe('beginner');
    });

    it('应该为专家调整难度', async () => {
      const expertProfile: CognitiveProfile = {
        ...mockProfile,
        expertise: mockProfile.expertise.map(e => ({ ...e, level: ExpertiseLevel.EXPERT })),
      };

      const result = await service.generate('user_1', mockStory, expertProfile);

      expect(result.personalization.difficultyLevel).toBe('advanced');
    });

    it('应该包含适配说明', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.personalization.adaptationNotes.length).toBeGreaterThan(0);
      expect(result.personalization.adaptationNotes.some(note => 
        note.includes('结构')
      )).toBe(true);
    });
  });

  describe('元信息', () => {
    it('应该正确记录元信息', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.meta.sourceCount).toBe(mockStory.meta.sourceCount);
      expect(result.meta.themeCount).toBe(mockStory.themes.length);
      expect(result.meta.generatedAt).toBeInstanceOf(Date);
      expect(result.meta.version).toBe(1);
    });

    it('应该估算阅读时间', async () => {
      const result = await service.generate('user_1', mockStory, mockProfile);

      expect(result.meta.totalReadTime.insight).toBeGreaterThan(0);
      expect(result.meta.totalReadTime.summary).toBeGreaterThan(0);
      expect(result.meta.totalReadTime.narrative).toBeGreaterThan(0);
      
      // insight 应该在 30秒左右
      expect(result.meta.totalReadTime.insight).toBeLessThanOrEqual(60);
      // summary 应该在 2分钟左右
      expect(result.meta.totalReadTime.summary).toBeLessThanOrEqual(300);
    });
  });

  describe('边界情况', () => {
    it('应该处理无视角的故事', async () => {
      const noPerspectiveStory = {
        ...mockStory,
        perspectives: undefined,
      };

      const result = await service.generate('user_1', noPerspectiveStory, mockProfile);

      expect(result).toBeDefined();
      expect(result.summary.perspectives).toEqual([]);
    });

    it('应该处理无时间线的故事', async () => {
      const noTimelineStory = {
        ...mockStory,
        timeline: undefined,
      };

      const result = await service.generate('user_1', noTimelineStory, mockProfile);

      expect(result).toBeDefined();
    });

    it('应该处理单主题故事', async () => {
      const singleThemeStory = {
        ...mockStory,
        themes: [mockStory.themes[0]],
      };

      const result = await service.generate('user_1', singleThemeStory, mockProfile);

      expect(result).toBeDefined();
      expect(result.narrative.sections.length).toBeGreaterThan(0);
    });

    it('对比结构在单观点时应退化', async () => {
      const singlePerspectiveStory = {
        ...mockStory,
        perspectives: {
          ...mockStory.perspectives!,
          perspectives: [mockStory.perspectives!.perspectives[0]],
        },
      };

      const options: Partial<SummaryOptions> = {
        preferredStructure: NarrativeStructure.COMPARE,
      };

      const result = await service.generate('user_1', singlePerspectiveStory, mockProfile, options);

      // 单观点时不应使用对比结构
      expect(result.narrative.structure).not.toBe(NarrativeStructure.COMPARE);
    });
  });
});
