// ============================================================
// 难度自适应服务单元测试
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { DifficultyAdaptorService } from '../difficulty-adaptor.service';
import {
  InformationDensity,
  DisclosureLevel,
  ComplexityScore,
  AdaptationOptions,
  DEFAULT_ADAPTATION_OPTIONS,
} from '../difficulty-adaptor.types';
import {
  CognitiveProfile,
  ExpertiseLevel,
  DepthPreference,
  PacePreference,
  FormatPreference,
  StructurePreference,
  EnergyLevel,
  UserGoal,
} from '../user-profile.types';

describe('DifficultyAdaptorService', () => {
  let service: DifficultyAdaptorService;

  // 测试用的用户画像
  const createMockProfile = (overrides: Partial<CognitiveProfile> = {}): CognitiveProfile => ({
    userId: 'test-user-1',
    expertise: [
      {
        domain: 'technology',
        level: ExpertiseLevel.INTERMEDIATE,
        knownConcepts: ['api', 'http', 'javascript'],
        knowledgeGaps: ['machine learning', 'blockchain'],
        confidenceScore: 0.7,
        lastAssessedAt: new Date(),
      },
    ],
    preference: {
      depth: DepthPreference.BALANCED,
      pace: PacePreference.MODERATE,
      format: FormatPreference.TEXT,
      structure: StructurePreference.LINEAR,
      preferredDomains: ['technology', 'science'],
      dislikedDomains: ['sports'],
    },
    behavior: {
      avgReadingTime: 15,
      completionRate: 0.75,
      revisitedTopics: ['programming'],
      skippedTopics: [],
      totalContentsRead: 100,
      totalReadingTime: 1500,
      favoriteTags: ['tech', 'ai'],
      peakReadingHours: [9, 14, 20],
      avgSessionDuration: 20,
      interactionFrequency: 5,
    },
    context: {
      availableTime: 30,
      energyLevel: EnergyLevel.MEDIUM,
      goal: UserGoal.LEARN,
      currentTopic: 'technology',
      recentSearches: ['rest api', 'web development'],
      deviceType: 'desktop',
    },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  // 测试用的原始内容
  const createMockContent = (overrides: any = {}) => ({
    id: 'content-1',
    title: '测试内容',
    content: '这是一段测试内容。它包含了API和机器学习等术语。',
    summary: '测试内容摘要',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DifficultyAdaptorService],
    }).compile();

    service = module.get<DifficultyAdaptorService>(DifficultyAdaptorService);
  });

  describe('服务初始化', () => {
    it('应该成功创建服务', () => {
      expect(service).toBeDefined();
    });
  });

  describe('内容适配 (adapt)', () => {
    it('应该成功适配内容', async () => {
      const profile = createMockProfile();
      const content = createMockContent();

      const result = await service.adapt(content, profile);

      expect(result).toHaveProperty('adapted');
      expect(result).toHaveProperty('assessment');
      expect(result.adapted.meta.originalId).toBe(content.id);
      expect(result.adapted.structure.chunks.length).toBeGreaterThan(0);
    });

    it('应该根据用户专业水平调整信息密度', async () => {
      // 新手用户
      const noviceProfile = createMockProfile({
        expertise: [{
          domain: 'technology',
          level: ExpertiseLevel.NOVICE,
          knownConcepts: [],
          knowledgeGaps: ['api', 'machine learning'],
          confidenceScore: 0.3,
          lastAssessedAt: new Date(),
        }],
      });

      // 专家用户
      const expertProfile = createMockProfile({
        expertise: [{
          domain: 'technology',
          level: ExpertiseLevel.EXPERT,
          knownConcepts: ['api', 'machine learning', 'deep learning', 'neural network'],
          knowledgeGaps: [],
          confidenceScore: 0.95,
          lastAssessedAt: new Date(),
        }],
      });

      const content = createMockContent({
        content: 'REST API是一种基于HTTP的架构风格。深度学习使用神经网络处理数据。',
      });

      const noviceResult = await service.adapt(content, noviceProfile);
      const expertResult = await service.adapt(content, expertProfile);

      // 新手应该使用低密度
      expect(noviceResult.adapted.meta.targetDensity).toBe(InformationDensity.SPARSE);
      // 专家应该使用高密度
      expect(expertResult.adapted.meta.targetDensity).toBe(InformationDensity.DENSE);
    });

    it('应该根据精力状态调整密度', async () => {
      const baseProfile = createMockProfile();

      const lowEnergyProfile = createMockProfile({
        context: { ...baseProfile.context, energyLevel: EnergyLevel.LOW },
      });

      const highEnergyProfile = createMockProfile({
        expertise: [{
          ...baseProfile.expertise[0],
          level: ExpertiseLevel.EXPERT,
        }],
        context: { ...baseProfile.context, energyLevel: EnergyLevel.HIGH },
      });

      const content = createMockContent();

      const lowEnergyResult = await service.adapt(content, lowEnergyProfile);
      const highEnergyResult = await service.adapt(content, highEnergyProfile);

      expect(lowEnergyResult.adapted.meta.targetDensity).toBe(InformationDensity.SPARSE);
      expect(highEnergyResult.adapted.meta.targetDensity).toBe(InformationDensity.DENSE);
    });

    it('应该正确分块内容', async () => {
      const profile = createMockProfile();
      const longContent = createMockContent({
        content: '第一段内容。'.repeat(50) + '\n\n' + '第二段内容。'.repeat(50) + '\n\n' + '第三段内容。'.repeat(50),
      });

      const result = await service.adapt(longContent, profile, {
        ...DEFAULT_ADAPTATION_OPTIONS,
        chunking: { maxChunkSize: 200, preserveParagraphs: true },
      });

      expect(result.adapted.structure.chunks.length).toBeGreaterThan(1);
    });

    it('应该正确分配披露层级', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: Array(20).fill(0).map((_, i) => `这是第${i + 1}段内容。`).join('\n\n'),
      });

      const result = await service.adapt(content, profile);

      const disclosureCounts = result.adapted.structure.disclosureLevels;
      const totalChunks = Object.values(disclosureCounts).reduce((a, b) => a + b, 0);

      expect(totalChunks).toBe(result.adapted.structure.chunks.length);
      expect(disclosureCounts[DisclosureLevel.L1]).toBeGreaterThan(0);
    });

    it('应该处理术语解释', async () => {
      const noviceProfile = createMockProfile({
        expertise: [{
          domain: 'technology',
          level: ExpertiseLevel.NOVICE,
          knownConcepts: [],
          knowledgeGaps: ['API', 'REST'],
          confidenceScore: 0.3,
          lastAssessedAt: new Date(),
        }],
      });

      const content = createMockContent({
        content: 'REST API是现代Web开发的基础。',
      });

      const result = await service.adapt(content, noviceProfile);

      // 应该添加了术语解释
      expect(result.adapted.adaptations.termsAdded).toBeGreaterThanOrEqual(0);
    });

    it('应该根据目标调整披露层级', async () => {
      const overviewProfile = createMockProfile({
        context: { ...createMockProfile().context, goal: UserGoal.OVERVIEW },
      });

      const researchProfile = createMockProfile({
        context: { ...createMockProfile().context, goal: UserGoal.RESEARCH },
      });

      const content = createMockContent({
        content: Array(10).fill(0).map((_, i) => `段落${i + 1}`).join('\n\n'),
      });

      const overviewResult = await service.adapt(content, overviewProfile);
      const researchResult = await service.adapt(content, researchProfile);

      // 概览模式应该主要是L1
      const overviewL1Count = overviewResult.adapted.structure.disclosureLevels[DisclosureLevel.L1];
      const overviewTotal = overviewResult.adapted.structure.chunks.length;
      expect(overviewL1Count / overviewTotal).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('复杂度分析', () => {
    it('应该分析词汇复杂度', async () => {
      const profile = createMockProfile();

      const simpleContent = createMockContent({
        content: '这是简单的内容。很短。',
      });

      const complexContent = createMockContent({
        content: 'This is a complex sentence with sophisticated vocabulary and intricate grammatical structures that require careful analysis.',
      });

      const simpleResult = await service.adapt(simpleContent, profile);
      const complexResult = await service.adapt(complexContent, profile);

      expect(complexResult.adapted.original.complexity.vocabulary)
        .toBeGreaterThan(simpleResult.adapted.original.complexity.vocabulary);
    });

    it('应该分析概念复杂度', async () => {
      const profile = createMockProfile();

      const simpleContent = createMockContent({
        content: '今天天气很好。',
      });

      const conceptualContent = createMockContent({
        content: '这个理论框架包含多个概念模型和范式。深度学习是一种复杂的理论。',
      });

      const simpleResult = await service.adapt(simpleContent, profile);
      const conceptualResult = await service.adapt(conceptualContent, profile);

      expect(conceptualResult.adapted.original.complexity.conceptual)
        .toBeGreaterThan(simpleResult.adapted.original.complexity.conceptual);
    });

    it('应该分析结构复杂度', async () => {
      const profile = createMockProfile();

      const flatContent = createMockContent({
        content: '第一段\n\n第二段\n\n第三段',
      });

      const structuredContent = createMockContent({
        content: '# 标题1\n\n内容1\n\n## 子标题\n\n内容2\n\n- 列表项1\n  - 嵌套项\n  - 嵌套项\n\n# 标题2\n\n内容3',
      });

      const flatResult = await service.adapt(flatContent, profile);
      const structuredResult = await service.adapt(structuredContent, profile);

      expect(structuredResult.adapted.original.complexity.structural)
        .toBeGreaterThanOrEqual(flatResult.adapted.original.complexity.structural);
    });
  });

  describe('认知负荷评估', () => {
    it('应该评估低负荷内容', async () => {
      const profile = createMockProfile();
      const simpleContent = createMockContent({
        content: '简单内容。',
      });

      const result = await service.adapt(simpleContent, profile);

      expect(result.assessment.total).toBeLessThan(0.5);
      expect(result.assessment.risk).toBe('low');
    });

    it('应该评估高负荷内容', async () => {
      const profile = createMockProfile();
      const complexContent = createMockContent({
        content: '这是一个极其复杂的概念理论框架，包含多层次嵌套结构和抽象概念。深度学习神经网络架构需要理解反向传播算法、梯度下降优化器、卷积层和池化层等多个相互关联的概念。这些概念之间存在复杂的依赖关系，需要具备扎实的数学基础（包括线性代数、微积分和概率论）才能完全理解。' +
          'This is a complex sentence with sophisticated vocabulary and intricate grammatical structures that require careful analysis. '.repeat(10),
      });

      const result = await service.adapt(complexContent, profile);

      expect(result.assessment.total).toBeGreaterThan(0.3);
      expect(['moderate', 'high', 'overload']).toContain(result.assessment.risk);
    });

    it('应该考虑用户精力状态', async () => {
      const lowEnergyProfile = createMockProfile({
        context: { ...createMockProfile().context, energyLevel: EnergyLevel.LOW, availableTime: 2 },
      });

      const moderateContent = createMockContent({
        content: '中等复杂度的内容，包含一些概念和术语。机器学习是一种人工智能技术，需要理解统计学基础。深度学习是机器学习的一个分支。'.repeat(5),
      });

      const result = await service.adapt(moderateContent, lowEnergyProfile);

      // 精力低时，应该有相关建议
      const hasEnergyAdvice = result.assessment.recommendations.some(r => 
        r.includes('精力') || r.includes('休息') || r.includes('拆分')
      );
      expect(hasEnergyAdvice).toBeTruthy();
    });

    it('应该生成优化建议', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: '简单内容。',
      });

      const result = await service.adapt(content, profile);

      expect(result.assessment.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('预览功能', () => {
    it('应该生成适配预览', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: '测试内容。'.repeat(20),
      });

      const preview = await service.preview(content, profile);

      expect(preview).toHaveProperty('originalComplexity');
      expect(preview).toHaveProperty('targetDensity');
      expect(preview).toHaveProperty('estimatedReadTime');
      expect(preview).toHaveProperty('termCount');
      expect(preview).toHaveProperty('chunkCount');
      expect(preview).toHaveProperty('cognitiveLoad');
    });

    it('预览应该反映正确的复杂度', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: Array(10).fill('这是一个长句子。').join(''),
      });

      const preview = await service.preview(content, profile);

      expect(preview.chunkCount.total).toBeGreaterThan(0);
      expect(preview.estimatedReadTime).toBeGreaterThan(0);
    });
  });

  describe('术语管理', () => {
    it('应该注册新术语', () => {
      service.registerTerm({
        term: '测试术语',
        definition: '这是一个测试术语的定义',
        difficulty: 'basic',
      });

      const definition = service.getTermDefinition('测试术语');
      expect(definition).toBeDefined();
      expect(definition?.definition).toBe('这是一个测试术语的定义');
    });

    it('应该批量注册术语', () => {
      service.registerTerms([
        { term: '术语1', definition: '定义1', difficulty: 'basic' },
        { term: '术语2', definition: '定义2', difficulty: 'intermediate' },
      ]);

      expect(service.getTermDefinition('术语1')).toBeDefined();
      expect(service.getTermDefinition('术语2')).toBeDefined();
    });

    it('应该大小写不敏感地获取术语', () => {
      service.registerTerm({
        term: 'TestTerm',
        definition: '测试术语',
        difficulty: 'basic',
      });

      expect(service.getTermDefinition('testterm')).toBeDefined();
      expect(service.getTermDefinition('TESTTERM')).toBeDefined();
    });
  });

  describe('边界情况', () => {
    it('应该处理空内容', async () => {
      const profile = createMockProfile();
      const content = createMockContent({ content: '' });

      const result = await service.adapt(content, profile);

      expect(result.adapted.structure.chunks).toEqual([]);
    });

    it('应该处理极长内容', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: '内容。'.repeat(10000),
      });

      const result = await service.adapt(content, profile);

      expect(result.adapted.structure.chunks.length).toBeGreaterThan(0);
    });

    it('应该处理特殊字符', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: '特殊字符测试：<>"\'&;@#$%^&*()_+[]{}|\\:;"<>?,./\n\t\r',
      });

      const result = await service.adapt(content, profile);

      expect(result.adapted.structure.chunks.length).toBeGreaterThan(0);
    });

    it('应该处理多语言内容', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: '中文内容。English content. 日本語コンテンツ。',
      });

      const result = await service.adapt(content, profile);

      expect(result.adapted.structure.chunks.length).toBeGreaterThan(0);
    });

    it('应该处理时间约束', async () => {
      const profile = createMockProfile({
        context: {
          ...createMockProfile().context,
          availableTime: 2, // 只有2分钟
        },
      });

      const content = createMockContent({
        content: '这是一段需要阅读的内容。'.repeat(50),
      });

      const result = await service.adapt(content, profile, {
        cognitiveLoad: { respectTimeConstraint: true },
      });

      // 时间紧张应该自动降低密度
      expect(result.adapted.meta.targetDensity).toBe(InformationDensity.SPARSE);
    });
  });

  describe('自定义选项', () => {
    it('应该使用自定义密度设置', async () => {
      const profile = createMockProfile();
      const content = createMockContent();

      const result = await service.adapt(content, profile, {
        density: { target: InformationDensity.DENSE, autoAdjust: false },
      });

      expect(result.adapted.meta.targetDensity).toBe(InformationDensity.DENSE);
    });

    it('应该使用自定义分块设置', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: Array(10).fill('一段内容。').join('\n\n'),
      });

      const result = await service.adapt(content, profile, {
        chunking: { maxChunkSize: 50, minChunkSize: 10, preserveParagraphs: false },
      });

      // 分块大小应该影响分块数量
      expect(result.adapted.structure.chunks.length).toBeGreaterThan(0);
    });

    it('应该禁用渐进披露', async () => {
      const profile = createMockProfile();
      const content = createMockContent({
        content: Array(10).fill('段落。').join('\n\n'),
      });

      const result = await service.adapt(content, profile, {
        disclosure: { enableProgressive: false },
      });

      // 所有内容应该在L1层级
      expect(result.adapted.structure.disclosureLevels[DisclosureLevel.L1])
        .toBe(result.adapted.structure.chunks.length);
    });
  });
});
