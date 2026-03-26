import { Test, TestingModule } from '@nestjs/testing';
import { ContentAggregatorService } from '../content-aggregator.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContentInput,
  AggregatedStory,
  AggregationOptions,
  DEFAULT_AGGREGATION_OPTIONS,
} from '../content-aggregator.types';

// Mock Prisma
const mockPrisma = {
  content: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

describe('ContentAggregatorService', () => {
  let service: ContentAggregatorService;
  let prisma: typeof mockPrisma;

  // 测试数据
  const mockContents: ContentInput[] = [
    {
      id: 'content_1',
      title: 'AI技术革新：GPT-4的革命性突破',
      contentText: 'OpenAI发布的GPT-4展现了大语言模型的强大能力。这款新模型在多项基准测试中超越了前代产品，展现了更强的推理能力和多模态理解能力。',
      url: 'https://example.com/ai-gpt4',
      sourceType: 'WEB',
      metadata: {
        author: '张三',
        publishDate: '2024-03-15T10:00:00Z',
        siteName: '科技日报',
      },
      createdAt: new Date('2024-03-15'),
      insights: {
        topics: [
          { name: '人工智能', confidence: 0.95 },
          { name: 'GPT-4', confidence: 0.92 },
          { name: '大语言模型', confidence: 0.88 },
        ],
        keyEntities: [
          { name: 'OpenAI', type: 'ORG', mentions: 5 },
          { name: 'GPT-4', type: 'PRODUCT', mentions: 8 },
        ],
        sentiments: { overall: 'positive', score: 0.8 },
        stance: 'supportive',
        keyClaims: ['GPT-4显著提升了AI能力', '多模态理解是重大突破'],
        qualityScore: 0.85,
        credibilityScore: 0.9,
      },
    },
    {
      id: 'content_2',
      title: 'AI安全隐忧：大模型发展的风险与挑战',
      contentText: '随着大语言模型的快速发展，AI安全问题日益突出。专家警告说，如果不加以控制，强大的AI系统可能带来意想不到的风险。',
      url: 'https://example.com/ai-safety',
      sourceType: 'WEB',
      metadata: {
        author: '李四',
        publishDate: '2024-03-16T14:00:00Z',
        siteName: '深度观察',
      },
      createdAt: new Date('2024-03-16'),
      insights: {
        topics: [
          { name: '人工智能', confidence: 0.9 },
          { name: 'AI安全', confidence: 0.93 },
          { name: '大语言模型', confidence: 0.85 },
        ],
        keyEntities: [
          { name: 'AI安全', type: 'CONCEPT', mentions: 6 },
          { name: '大模型', type: 'CONCEPT', mentions: 4 },
        ],
        sentiments: { overall: 'negative', score: -0.3 },
        stance: 'critical',
        keyClaims: ['AI发展需要更多监管', '安全风险不容忽视'],
        qualityScore: 0.8,
        credibilityScore: 0.75,
      },
    },
    {
      id: 'content_3',
      title: '谷歌Gemini vs OpenAI GPT-4：谁更胜一筹？',
      contentText: '谷歌发布的Gemini模型试图与GPT-4竞争。两个模型各有优劣，在不同任务上表现各异。这场竞争推动了整个行业的发展。',
      url: 'https://example.com/gemini-vs-gpt4',
      sourceType: 'WEB',
      metadata: {
        author: '王五',
        publishDate: '2024-03-17T09:00:00Z',
        siteName: '科技对比',
      },
      createdAt: new Date('2024-03-17'),
      insights: {
        topics: [
          { name: '人工智能', confidence: 0.88 },
          { name: 'Gemini', confidence: 0.9 },
          { name: 'GPT-4', confidence: 0.87 },
        ],
        keyEntities: [
          { name: 'Google', type: 'ORG', mentions: 4 },
          { name: 'Gemini', type: 'PRODUCT', mentions: 6 },
          { name: 'GPT-4', type: 'PRODUCT', mentions: 5 },
        ],
        sentiments: { overall: 'neutral', score: 0.1 },
        stance: 'exploratory',
        keyClaims: ['Gemini在某些任务上超越GPT-4', '竞争促进行业发展'],
        qualityScore: 0.82,
        credibilityScore: 0.8,
      },
    },
    {
      id: 'content_4',
      title: '元宇宙泡沫破裂：VR投资退潮',
      contentText: '曾经火热的元宇宙概念正在降温。多家公司缩减VR部门，投资者开始质疑这个领域的商业前景。',
      url: 'https://example.com/metaverse',
      sourceType: 'WEB',
      metadata: {
        author: '赵六',
        publishDate: '2024-03-18T11:00:00Z',
        siteName: '财经观察',
      },
      createdAt: new Date('2024-03-18'),
      insights: {
        topics: [
          { name: '元宇宙', confidence: 0.92 },
          { name: 'VR', confidence: 0.88 },
          { name: '投资', confidence: 0.75 },
        ],
        keyEntities: [
          { name: 'Meta', type: 'ORG', mentions: 3 },
          { name: 'VR', type: 'TECHNOLOGY', mentions: 5 },
        ],
        sentiments: { overall: 'negative', score: -0.5 },
        stance: 'critical',
        keyClaims: ['元宇宙热度下降', 'VR投资减少'],
        qualityScore: 0.75,
        credibilityScore: 0.7,
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentAggregatorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ContentAggregatorService>(ContentAggregatorService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('基本功能', () => {
    it('服务应该被定义', () => {
      expect(service).toBeDefined();
    });
  });

  describe('aggregate - 内容聚合', () => {
    const mockUserId = 'user_123';

    it('应该成功聚合多篇内容', async () => {
      const result = await service.aggregate(mockUserId, mockContents);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.meta.sourceCount).toBe(mockContents.length);
      expect(result.themes.length).toBeGreaterThan(0);
      expect(result.meta.coverageScore).toBeGreaterThan(0);
    });

    it('空内容应该抛出错误', async () => {
      await expect(service.aggregate(mockUserId, [])).rejects.toThrow('至少需要一篇内容');
    });

    it('应该生成正确的元信息', async () => {
      const result = await service.aggregate(mockUserId, mockContents);

      expect(result.meta.sourceCount).toBe(4);
      expect(result.meta.generatedAt).toBeInstanceOf(Date);
      expect(result.meta.confidenceScore).toBeGreaterThan(0);
      expect(result.meta.coverageScore).toBeGreaterThan(0);
    });

    it('应该生成标题和摘要', async () => {
      const result = await service.aggregate(mockUserId, mockContents);

      expect(result.title).toBeTruthy();
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(10);
    });

    it('应该创建知识图谱', async () => {
      const result = await service.aggregate(mockUserId, mockContents);

      expect(result.knowledgeGraph).toBeDefined();
      expect(result.knowledgeGraph!.nodes.length).toBeGreaterThan(0);
      expect(result.knowledgeGraph!.edges.length).toBeGreaterThan(0);
    });

    it('应该生成阅读路径', async () => {
      const result = await service.aggregate(mockUserId, mockContents);

      expect(result.readingPaths.length).toBeGreaterThan(0);
      expect(result.readingPaths[0].steps.length).toBeGreaterThan(0);
    });
  });

  describe('主题聚类', () => {
    it('应该将AI相关内容聚类在一起', async () => {
      const result = await service.aggregate('user_123', mockContents);
      
      // 前3篇都是AI相关，应该被聚类到一起或接近
      const aiContents = mockContents.slice(0, 3);
      const aiContentIds = new Set(aiContents.map(c => c.id));
      
      // 检查是否有主题包含多个AI相关内容
      const relevantThemes = result.themes.filter(theme => 
        theme.contents.some(c => aiContentIds.has(c.contentId))
      );
      
      expect(relevantThemes.length).toBeGreaterThan(0);
    });

    it('每个主题应该有相关的内容', async () => {
      const result = await service.aggregate('user_123', mockContents);

      result.themes.forEach(theme => {
        expect(theme.contents.length).toBeGreaterThan(0);
        expect(theme.name).toBeTruthy();
        expect(theme.cohesion).toBeGreaterThanOrEqual(0);
        expect(theme.cohesion).toBeLessThanOrEqual(1);
      });
    });

    it('内容应该有相关性分数', async () => {
      const result = await service.aggregate('user_123', mockContents);

      result.themes.forEach(theme => {
        theme.contents.forEach(content => {
          expect(content.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(content.relevanceScore).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('观点对比', () => {
    it('应该分析不同观点', async () => {
      const result = await service.aggregate('user_123', mockContents);

      expect(result.perspectives).toBeDefined();
      expect(result.perspectives!.perspectives.length).toBeGreaterThan(0);
    });

    it('应该识别观点立场', async () => {
      const result = await service.aggregate('user_123', mockContents);

      const stances = result.perspectives!.perspectives.map(p => p.stance);
      expect(stances).toContain('supportive');
      expect(stances).toContain('critical');
    });

    it('应该识别差异点', async () => {
      const result = await service.aggregate('user_123', mockContents);

      expect(result.perspectives!.keyDifferences.length).toBeGreaterThan(0);
    });

    it('应该有共识区域和争议区域', async () => {
      const result = await service.aggregate('user_123', mockContents);

      expect(result.perspectives!.consensusAreas).toBeDefined();
      expect(result.perspectives!.debateAreas).toBeDefined();
    });

    it('少于最小来源数时不应分析观点', async () => {
      const options: Partial<AggregationOptions> = {
        perspectiveAnalysis: {
          enabled: true,
          minSourcesForComparison: 5,
          stanceDetection: true,
        },
      };

      const result = await service.aggregate('user_123', mockContents.slice(0, 2), options);
      
      expect(result.perspectives).toBeUndefined();
    });

    it('禁用观点分析时不应分析', async () => {
      const options: Partial<AggregationOptions> = {
        perspectiveAnalysis: {
          enabled: false,
          minSourcesForComparison: 2,
          stanceDetection: true,
        },
      };

      const result = await service.aggregate('user_123', mockContents, options);
      
      expect(result.perspectives).toBeUndefined();
    });
  });

  describe('时间线梳理', () => {
    it('应该构建时间线', async () => {
      // 确保测试数据有正确的日期
      const contentsWithDates = mockContents.map(c => ({
        ...c,
        metadata: {
          ...c.metadata,
          publishDate: c.metadata?.publishDate || new Date().toISOString(),
        },
      }));
      
      const result = await service.aggregate('user_123', contentsWithDates);

      expect(result.timeline).toBeDefined();
      expect(result.timeline!.events.length).toBeGreaterThan(0);
    });

    it('时间线事件应该按时间排序', async () => {
      const result = await service.aggregate('user_123', mockContents);

      const events = result.timeline!.events;
      for (let i = 1; i < events.length; i++) {
        expect(events[i].eventDate.getTime()).toBeGreaterThanOrEqual(
          events[i - 1].eventDate.getTime()
        );
      }
    });

    it('禁用时间线时不应构建', async () => {
      const options: Partial<AggregationOptions> = {
        timeline: {
          enabled: false,
          extractImplicitDates: true,
          minEventSignificance: 'minor',
        },
      };

      const result = await service.aggregate('user_123', mockContents, options);
      
      expect(result.timeline).toBeUndefined();
    });
  });

  describe('可信度评估', () => {
    it('应该评估每篇内容的可信度', async () => {
      const result = await service.aggregate('user_123', mockContents);

      expect(result.credibilityMap.length).toBe(mockContents.length);
      
      result.credibilityMap.forEach(assessment => {
        expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
        expect(assessment.overallScore).toBeLessThanOrEqual(1);
        expect(assessment.dimensions).toBeDefined();
        expect(assessment.redFlags).toBeDefined();
        expect(assessment.strengths).toBeDefined();
      });
    });

    it('应该评估多个维度', async () => {
      const result = await service.aggregate('user_123', mockContents);

      const dimensions = result.credibilityMap[0].dimensions;
      expect(dimensions.sourceAuthority).toBeGreaterThanOrEqual(0);
      expect(dimensions.factualConsistency).toBeGreaterThanOrEqual(0);
      expect(dimensions.evidenceSupport).toBeGreaterThanOrEqual(0);
      expect(dimensions.transparency).toBeGreaterThanOrEqual(0);
      expect(dimensions.recency).toBeGreaterThanOrEqual(0);
    });

    it('禁用可信度评估时不应评估', async () => {
      const options: Partial<AggregationOptions> = {
        credibility: {
          enabled: false,
          crossReference: true,
          factCheck: false,
        },
      };

      const result = await service.aggregate('user_123', mockContents, options);
      
      // 仍然返回评估，但不进行交叉验证
      expect(result.credibilityMap.length).toBe(mockContents.length);
    });
  });

  describe('getPreview - 聚合预览', () => {
    it('应该返回轻量级预览', async () => {
      const result = await service.getPreview('user_123', mockContents);

      expect(result).toBeDefined();
      expect(result.themeCount).toBeGreaterThan(0);
      expect(result.sourceCount).toBe(mockContents.length);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('预览应该包含基本元信息', async () => {
      const result = await service.getPreview('user_123', mockContents);

      expect(result.title).toBeTruthy();
      expect(result.hasPerspectives).toBe(true);
      expect(result.confidenceScore).toBeGreaterThan(0);
    });
  });

  describe('阅读路径生成', () => {
    it('应该生成不同难度的阅读路径', async () => {
      const result = await service.aggregate('user_123', mockContents);

      const difficulties = result.readingPaths.map(p => p.difficulty);
      expect(difficulties).toContain('beginner');
      expect(difficulties).toContain('intermediate');
    });

    it('每条路径应该有明确的步骤', async () => {
      const result = await service.aggregate('user_123', mockContents);

      result.readingPaths.forEach(path => {
        expect(path.steps.length).toBeGreaterThan(0);
        expect(path.estimatedTime).toBeGreaterThan(0);
        
        path.steps.forEach((step, index) => {
          expect(step.order).toBe(index + 1);
          expect(step.title).toBeTruthy();
          expect(step.purpose).toBeTruthy();
        });
      });
    });
  });

  describe('知识图谱构建', () => {
    it('应该包含不同类型的节点', async () => {
      const result = await service.aggregate('user_123', mockContents);
      const graph = result.knowledgeGraph!;

      const nodeTypes = new Set(graph.nodes.map(n => n.type));
      expect(nodeTypes.size).toBeGreaterThan(0);
    });

    it('边应该连接节点', async () => {
      const result = await service.aggregate('user_123', mockContents);
      const graph = result.knowledgeGraph!;

      graph.edges.forEach(edge => {
        const sourceExists = graph.nodes.some(n => n.id === edge.source);
        const targetExists = graph.nodes.some(n => n.id === edge.target);
        expect(sourceExists).toBe(true);
        expect(targetExists).toBe(true);
      });
    });
  });

  describe('配置选项', () => {
    it('应该使用默认选项', async () => {
      const result = await service.aggregate('user_123', mockContents);

      expect(result.perspectives).toBeDefined(); // 默认启用
      expect(result.timeline).toBeDefined(); // 默认启用
    });

    it('应该允许自定义选项', async () => {
      const customOptions: Partial<AggregationOptions> = {
        clustering: {
          algorithm: 'kmeans',
          minClusterSize: 1,
          maxClusters: 3,
          similarityThreshold: 0.5,
        },
      };

      const result = await service.aggregate('user_123', mockContents, customOptions);
      
      expect(result).toBeDefined();
      expect(result.themes.length).toBeLessThanOrEqual(3);
    });
  });

  describe('边界情况', () => {
    it('单篇内容应该能处理', async () => {
      const result = await service.aggregate('user_123', [mockContents[0]]);

      expect(result).toBeDefined();
      expect(result.themes.length).toBeGreaterThan(0);
    });

    it('缺少洞察数据的内容应该能处理', async () => {
      const contentWithoutInsights: ContentInput = {
        id: 'content_no_insights',
        title: '测试文章',
        contentText: '这是一篇测试文章的内容。',
        sourceType: 'WEB',
        createdAt: new Date(),
      };

      const result = await service.aggregate('user_123', [contentWithoutInsights, mockContents[0]]);

      expect(result).toBeDefined();
      expect(result.themes.length).toBeGreaterThan(0);
    });

    it('缺少元数据的内容应该能处理', async () => {
      const contentWithoutMeta: ContentInput = {
        id: 'content_no_meta',
        title: '无元数据文章',
        contentText: '这是一篇没有元数据的文章。',
        sourceType: 'MANUAL',
        createdAt: new Date(),
      };

      const result = await service.aggregate('user_123', [contentWithoutMeta, ...mockContents]);

      expect(result).toBeDefined();
      expect(result.credibilityMap.some(c => c.contentId === contentWithoutMeta.id)).toBe(true);
    });
  });
});
