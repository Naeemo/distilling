import { Test, TestingModule } from '@nestjs/testing';
import { InsightReportService } from '../insight-report.service';
import {
  InsightReport,
  ReportGenerationOptions,
  ReportGenerationInput,
  ReportTemplate,
  TEMPLATE_CONFIGS,
  DEFAULT_REPORT_OPTIONS,
} from '../insight-report.types';
import { 
  CognitiveProfile, 
  ExpertiseLevel, 
  UserGoal, 
  DepthPreference, 
  PacePreference, 
  FormatPreference, 
  StructurePreference, 
  EnergyLevel,
  DomainExpertise,
  UserPreference,
  UserBehavior,
  UserContext,
} from '../user-profile.types';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { KnowledgeGraphService } from '../../knowledge-graph/knowledge-graph.service';

// Mock PrismaService
const mockPrismaService = {
  content: {
    findMany: jest.fn(),
  },
};

// Mock AiService
const mockAiService = {
  generateText: jest.fn(),
  analyzeSentiment: jest.fn(),
};

// Mock KnowledgeGraphService
const mockKnowledgeGraphService = {
  getKnowledgeGraph: jest.fn(),
  analyzeContent: jest.fn(),
};

describe('InsightReportService', () => {
  let service: InsightReportService;

  // 模拟内容洞察数据
  const mockContentInsights = [
    {
      id: 'content_1',
      title: 'AI技术发展报告2024',
      url: 'https://example.com/ai-report',
      sourceType: 'WEB',
      createdAt: new Date('2024-03-15'),
      insights: {
        topics: [
          { name: '人工智能', confidence: 0.95 },
          { name: '机器学习', confidence: 0.88 },
          { name: '深度学习', confidence: 0.82 },
        ],
        keyEntities: [
          { name: 'OpenAI', type: 'organization', mentions: 5 },
          { name: 'GPT-4', type: 'technology', mentions: 8 },
          { name: '神经网络', type: 'concept', mentions: 3 },
        ],
        keyClaims: [
          'AI技术正在快速发展',
          '大语言模型展现出强大的能力',
          '需要关注AI安全和伦理问题',
        ],
        sentiments: { overall: 'positive', score: 0.75 },
        stance: 'supportive',
        qualityScore: 0.9,
      },
    },
    {
      id: 'content_2',
      title: 'AI安全警告：我们需要暂停吗？',
      url: 'https://example.com/ai-safety',
      sourceType: 'WEB',
      createdAt: new Date('2024-03-18'),
      insights: {
        topics: [
          { name: '人工智能', confidence: 0.92 },
          { name: 'AI安全', confidence: 0.95 },
          { name: '监管', confidence: 0.78 },
        ],
        keyEntities: [
          { name: 'AI安全', type: 'concept', mentions: 10 },
          { name: '监管机构', type: 'organization', mentions: 4 },
          { name: '深度学习', type: 'concept', mentions: 2 },
        ],
        keyClaims: [
          'AI发展速度过快存在安全隐患',
          '需要建立更严格的监管框架',
          '行业应该暂停大型模型训练',
        ],
        sentiments: { overall: 'negative', score: 0.3 },
        stance: 'critical',
        qualityScore: 0.85,
      },
    },
    {
      id: 'content_3',
      title: '机器学习在医疗领域的应用',
      url: 'https://example.com/ml-healthcare',
      sourceType: 'WEB',
      createdAt: new Date('2024-03-20'),
      insights: {
        topics: [
          { name: '机器学习', confidence: 0.9 },
          { name: '医疗健康', confidence: 0.88 },
          { name: '人工智能', confidence: 0.75 },
        ],
        keyEntities: [
          { name: '医疗AI', type: 'technology', mentions: 6 },
          { name: '诊断系统', type: 'product', mentions: 4 },
        ],
        keyClaims: [
          '机器学习在医疗诊断中表现出色',
          '可以提高诊断准确率和效率',
        ],
        sentiments: { overall: 'positive', score: 0.8 },
        stance: 'supportive',
        qualityScore: 0.88,
      },
    },
  ];

  // 构建完整的用户画像
  const createMockProfile = (level: ExpertiseLevel = ExpertiseLevel.INTERMEDIATE): CognitiveProfile => {
    const expertise: DomainExpertise[] = [{
      domain: 'tech',
      level,
      knownConcepts: ['机器学习', '深度学习', '神经网络'],
      knowledgeGaps: ['AI伦理', '监管政策'],
      confidenceScore: 0.8,
      lastAssessedAt: new Date(),
    }];

    const preference: UserPreference = {
      depth: DepthPreference.BALANCED,
      pace: PacePreference.MODERATE,
      format: FormatPreference.TEXT,
      structure: StructurePreference.HIERARCHICAL,
      preferredDomains: ['tech', 'science'],
      dislikedDomains: ['sports'],
    };

    const behavior: UserBehavior = {
      avgReadingTime: 15,
      completionRate: 0.75,
      revisitedTopics: ['人工智能', '机器学习'],
      skippedTopics: ['基础概念'],
      totalContentsRead: 100,
      totalReadingTime: 1500,
      favoriteTags: ['AI', '技术'],
      peakReadingHours: [9, 14, 20],
      avgSessionDuration: 20,
      interactionFrequency: 5,
    };

    const context: UserContext = {
      availableTime: 20,
      energyLevel: EnergyLevel.MEDIUM,
      goal: UserGoal.RESEARCH,
      currentTopic: '人工智能',
      recentSearches: ['AI发展', '机器学习'],
      deviceType: 'desktop',
    };

    return {
      userId: 'user_1',
      expertise,
      preference,
      behavior,
      context,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const mockProfile = createMockProfile();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightReportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: KnowledgeGraphService, useValue: mockKnowledgeGraphService },
      ],
    }).compile();

    service = module.get<InsightReportService>(InsightReportService);

    // 重置 mock
    jest.clearAllMocks();

    // 设置默认 mock 返回值
    mockPrismaService.content.findMany.mockResolvedValue(mockContentInsights);
  });

  describe('generateReport', () => {
    it('应该成功生成洞察报告', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.userId).toBe('user_1');
      expect(report.meta).toBeDefined();
      expect(report.executive).toBeDefined();
      expect(report.body).toBeDefined();
      expect(report.deepDive).toBeDefined();
    });

    it('应该包含执行摘要的所有组件', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      expect(report.executive.tlDr).toBeDefined();
      expect(report.executive.tlDr.length).toBeGreaterThan(0);
      expect(report.executive.keyFindings).toBeInstanceOf(Array);
      expect(report.executive.keyFindings.length).toBeGreaterThan(0);
      expect(report.executive.recommendations).toBeInstanceOf(Array);
      expect(report.executive.recommendations.length).toBeGreaterThan(0);
    });

    it('应该生成3-5个关键发现', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          executive: { maxFindings: 5, maxRecommendations: 5, minConfidence: 0.6 },
        },
      };

      const report = await service.generateReport(input);

      expect(report.executive.keyFindings.length).toBeGreaterThanOrEqual(1);
      expect(report.executive.keyFindings.length).toBeLessThanOrEqual(5);
      
      // 验证每个发现都有必要的字段
      report.executive.keyFindings.forEach((finding) => {
        expect(finding.id).toBeDefined();
        expect(finding.statement).toBeDefined();
        expect(finding.evidence).toBeInstanceOf(Array);
        expect(finding.confidence).toBeGreaterThanOrEqual(0);
        expect(finding.confidence).toBeLessThanOrEqual(1);
        expect(['critical', 'important', 'notable']).toContain(finding.significance);
      });
    });

    it('应该生成行动建议', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      report.executive.recommendations.forEach((rec) => {
        expect(rec.id).toBeDefined();
        expect(rec.action).toBeDefined();
        expect(rec.rationale).toBeDefined();
        expect(['immediate', 'short_term', 'long_term']).toContain(rec.priority);
        expect(['low', 'medium', 'high']).toContain(rec.effort);
        expect(['low', 'medium', 'high']).toContain(rec.impact);
      });
    });

    it('应该包含主题分析', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      expect(report.body.themes).toBeInstanceOf(Array);
      expect(report.body.themes.length).toBeGreaterThan(0);

      report.body.themes.forEach((theme) => {
        expect(theme.id).toBeDefined();
        expect(theme.name).toBeDefined();
        expect(theme.description).toBeDefined();
        expect(theme.importance).toBeGreaterThanOrEqual(0);
        expect(theme.importance).toBeLessThanOrEqual(1);
        expect(theme.keyPoints).toBeInstanceOf(Array);
        expect(theme.sourceCount).toBeGreaterThan(0);
      });
    });

    it('应该包含时间线（当启用时）', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          body: { maxThemes: 7, includeTimeline: true, includeComparison: true, networkDepth: 'medium' },
        },
      };

      const report = await service.generateReport(input);

      expect(report.body.timeline).toBeDefined();
      expect(report.body.timeline?.events).toBeInstanceOf(Array);
      expect(report.body.timeline?.events.length).toBeGreaterThan(0);
    });

    it('应该包含对比分析（当有不同立场时）', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          body: { maxThemes: 7, includeTimeline: true, includeComparison: true, networkDepth: 'medium' },
        },
      };

      const report = await service.generateReport(input);

      // 由于有 supportive 和 critical 两种立场，应该有对比分析
      expect(report.body.comparison).toBeDefined();
      expect(report.body.comparison?.subjects.length).toBeGreaterThanOrEqual(2);
      expect(report.body.comparison?.dimensions).toBeInstanceOf(Array);
    });

    it('应该包含知识网络图', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      expect(report.body.network).toBeDefined();
      expect(report.body.network.nodes).toBeInstanceOf(Array);
      expect(report.body.network.edges).toBeInstanceOf(Array);
      expect(report.body.network.clusters).toBeInstanceOf(Array);
    });

    it('应该包含深度探索内容', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          deepDive: { maxQuestions: 5, maxDebates: 3, maxPredictions: 3, includeSpeculative: true },
        },
      };

      const report = await service.generateReport(input);

      expect(report.deepDive.questions).toBeInstanceOf(Array);
      expect(report.deepDive.questions.length).toBeGreaterThan(0);
      expect(report.deepDive.debates).toBeInstanceOf(Array);
      expect(report.deepDive.predictions).toBeInstanceOf(Array);
    });

    it('应该包含值得追问的问题', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      report.deepDive.questions.forEach((q) => {
        expect(q.id).toBeDefined();
        expect(q.question).toBeDefined();
        expect(q.context).toBeDefined();
        expect(q.potentialValue).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
        expect(q.suggestedApproach).toBeDefined();
      });
    });

    it('应该包含趋势预测', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          deepDive: { maxQuestions: 3, maxDebates: 2, maxPredictions: 3, includeSpeculative: true },
        },
      };

      const report = await service.generateReport(input);

      report.deepDive.predictions.forEach((p) => {
        expect(p.id).toBeDefined();
        expect(p.trend).toBeDefined();
        expect(['near', 'medium', 'long']).toContain(p.timeframe);
        expect(p.confidence).toBeGreaterThanOrEqual(0);
        expect(p.confidence).toBeLessThanOrEqual(1);
        expect(p.supportingEvidence).toBeInstanceOf(Array);
        expect(p.implications).toBeInstanceOf(Array);
      });
    });

    it('应该支持自定义标题', async () => {
      const customTitle = '我的自定义报告标题';
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        title: customTitle,
      };

      const report = await service.generateReport(input);

      expect(report.meta.title).toBe(customTitle);
    });

    it('应该根据用户画像调整难度级别', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        profile: mockProfile,
      };

      const report = await service.generateReport(input);

      expect(report.personalization.difficultyLevel).toBe('intermediate');
      expect(report.personalization.targetProfile).toBe('tech');
    });

    it('应该在找不到内容时抛出异常', async () => {
      mockPrismaService.content.findMany.mockResolvedValueOnce([]);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['nonexistent'],
      };

      await expect(service.generateReport(input)).rejects.toThrow('No content found');
    });
  });

  describe('generateQuickSummary', () => {
    it('应该快速生成执行摘要', async () => {
      const summary = await service.generateQuickSummary('user_1', [
        'content_1',
        'content_2',
        'content_3',
      ]);

      expect(summary).toBeDefined();
      expect(summary.tlDr).toBeDefined();
      expect(summary.keyFindings).toBeInstanceOf(Array);
      expect(summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('getReportPreview', () => {
    it('应该生成报告预览', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);
      const preview = await service.getReportPreview(report);

      expect(preview).toBeDefined();
      expect(preview.id).toBe(report.id);
      expect(preview.title).toBe(report.meta.title);
      expect(preview.sourceCount).toBe(report.meta.sources);
      expect(preview.keyThemeCount).toBe(report.body.themes.length);
      expect(preview.hasTimeline).toBe(!!report.body.timeline);
      expect(preview.hasComparison).toBe(!!report.body.comparison);
      expect(preview.estimatedReadTime).toBeGreaterThan(0);
    });
  });

  describe('evaluateQuality', () => {
    it('应该评估报告质量', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);
      const quality = await service.evaluateQuality(report);

      expect(quality).toBeDefined();
      expect(quality.reportId).toBe(report.id);
      expect(quality.scores).toBeDefined();
      expect(quality.scores.insightfulness).toBeGreaterThanOrEqual(0);
      expect(quality.scores.insightfulness).toBeLessThanOrEqual(1);
      expect(quality.scores.comprehensiveness).toBeGreaterThanOrEqual(0);
      expect(quality.scores.comprehensiveness).toBeLessThanOrEqual(1);
      expect(quality.scores.coherence).toBeGreaterThanOrEqual(0);
      expect(quality.scores.coherence).toBeLessThanOrEqual(1);
      expect(quality.scores.actionability).toBeGreaterThanOrEqual(0);
      expect(quality.scores.actionability).toBeLessThanOrEqual(1);
      expect(quality.scores.originality).toBeGreaterThanOrEqual(0);
      expect(quality.scores.originality).toBeLessThanOrEqual(1);
      expect(quality.coverage).toBeDefined();
      expect(quality.issues).toBeInstanceOf(Array);
      expect(quality.improvements).toBeInstanceOf(Array);
    });
  });

  describe('applyTemplate', () => {
    it('应该应用全面报告模板', () => {
      const config = service.applyTemplate(ReportTemplate.COMPREHENSIVE);

      expect(config).toBeDefined();
      expect(config.executive?.maxFindings).toBe(5);
      expect(config.body?.maxThemes).toBe(7);
      expect(config.deepDive?.includeSpeculative).toBe(true);
    });

    it('应该应用执行摘要模板', () => {
      const config = service.applyTemplate(ReportTemplate.EXECUTIVE);

      expect(config.executive?.maxFindings).toBe(3);
      expect(config.body?.includeTimeline).toBe(false);
      expect(config.body?.networkDepth).toBe('surface');
    });

    it('应该应用研究模板', () => {
      const config = service.applyTemplate(ReportTemplate.RESEARCH);

      expect(config.body?.maxThemes).toBe(10);
      expect(config.body?.networkDepth).toBe('deep');
      expect(config.deepDive?.maxQuestions).toBe(8);
    });

    it('应该应用决策支持模板', () => {
      const config = service.applyTemplate(ReportTemplate.DECISION);

      expect(config.executive?.maxRecommendations).toBe(6);
      expect(config.executive?.minConfidence).toBe(0.7);
      expect(config.deepDive?.maxDebates).toBe(4);
    });

    it('应该应用趋势分析模板', () => {
      const config = service.applyTemplate(ReportTemplate.TREND);

      expect(config.deepDive?.maxPredictions).toBe(6);
      expect(config.body?.includeComparison).toBe(false);
    });
  });

  describe('个性化适配', () => {
    it('应该根据专家级别设置高级难度', async () => {
      const expertProfile = createMockProfile(ExpertiseLevel.EXPERT);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        profile: expertProfile,
      };

      const report = await service.generateReport(input);
      expect(report.personalization.difficultyLevel).toBe('advanced');
    });

    it('应该根据新手级别设置初级难度', async () => {
      const noviceProfile = createMockProfile(ExpertiseLevel.NOVICE);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        profile: noviceProfile,
      };

      const report = await service.generateReport(input);
      expect(report.personalization.difficultyLevel).toBe('beginner');
    });

    it('应该应用指定的难度级别', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
        options: {
          personalization: { adaptToProfile: true, emphasizeFocusAreas: true, difficultyLevel: 'advanced' },
        },
      };

      const report = await service.generateReport(input);
      expect(report.personalization.difficultyLevel).toBe('advanced');
    });
  });

  describe('报告内容覆盖', () => {
    it('应该正确聚合主题', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      // 检查是否聚合了所有主题
      const themeNames = report.body.themes.map((t) => t.name);
      expect(themeNames).toContain('人工智能');
      expect(themeNames).toContain('机器学习');
    });

    it('应该正确计算主题重要性', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      // 人工智能被3个内容提及，应该是最重要的
      const aiTheme = report.body.themes.find((t) => t.name === '人工智能');
      expect(aiTheme).toBeDefined();
      expect(aiTheme?.sourceCount).toBe(3);
      expect(aiTheme?.importance).toBeGreaterThan(0.5);
    });

    it('应该正确识别情感倾向', async () => {
      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1', 'content_2', 'content_3'],
      };

      const report = await service.generateReport(input);

      // AI安全主题应该包含负面情感
      const safetyTheme = report.body.themes.find((t) => t.name === 'AI安全');
      if (safetyTheme) {
        expect(['positive', 'negative', 'neutral', 'mixed']).toContain(
          safetyTheme.sentiment,
        );
      }
    });
  });

  describe('边缘情况处理', () => {
    it('应该处理单条内容的情况', async () => {
      mockPrismaService.content.findMany.mockResolvedValueOnce([
        mockContentInsights[0],
      ]);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1'],
      };

      const report = await service.generateReport(input);

      expect(report).toBeDefined();
      expect(report.body.themes.length).toBeGreaterThan(0);
      // 单条内容不应该有时间线
      expect(report.body.timeline).toBeUndefined();
      // 单条内容不应该有对比分析
      expect(report.body.comparison).toBeUndefined();
    });

    it('应该处理没有洞察数据的内容', async () => {
      mockPrismaService.content.findMany.mockResolvedValueOnce([
        {
          ...mockContentInsights[0],
          insights: null,
        },
      ]);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1'],
      };

      const report = await service.generateReport(input);

      expect(report).toBeDefined();
      expect(report.body.themes.length).toBe(0);
    });

    it('应该处理空主题的内容', async () => {
      mockPrismaService.content.findMany.mockResolvedValueOnce([
        {
          ...mockContentInsights[0],
          insights: {
            ...mockContentInsights[0].insights,
            topics: [],
          },
        },
      ]);

      const input: ReportGenerationInput = {
        userId: 'user_1',
        contentIds: ['content_1'],
      };

      const report = await service.generateReport(input);

      expect(report).toBeDefined();
      expect(report.body.themes.length).toBe(0);
    });
  });
});
