// ============================================================
// 难度自适应服务 (DifficultyAdaptorService)
// 基于认知负荷理论实现内容自适应
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  InformationDensity,
  DisclosureLevel,
  ComplexityScore,
  TermDefinition,
  ContentChunk,
  AdaptedContent,
  ChunkHierarchy,
  AdaptationOptions,
  CognitiveLoadAssessment,
  TermExtraction,
  AdaptationPreview,
  DEFAULT_ADAPTATION_OPTIONS,
  EXPERTISE_DENSITY_MAP,
  COMPLEXITY_THRESHOLDS,
} from './difficulty-adaptor.types';
import {
  CognitiveProfile,
  ExpertiseLevel,
  UserGoal,
  EnergyLevel,
  DepthPreference,
} from './user-profile.types';

/**
 * 原始内容接口 (来自内容聚合)
 */
interface RawContent {
  id: string;
  title: string;
  content: string;
  summary?: string;
  terms?: TermDefinition[];
  complexity?: ComplexityScore;
}

/**
 * 内容适配结果
 */
interface AdaptationResult {
  adapted: AdaptedContent;
  assessment: CognitiveLoadAssessment;
}

@Injectable()
export class DifficultyAdaptorService {
  private readonly logger = new Logger(DifficultyAdaptorService.name);

  // 术语数据库 (简化的内存存储，实际应连接数据库)
  private termDatabase: Map<string, TermDefinition> = new Map();

  constructor() {
    this.initializeTermDatabase();
  }

  /**
   * 初始化术语数据库
   */
  private initializeTermDatabase(): void {
    // 预置一些常用术语定义
    const defaultTerms: TermDefinition[] = [
      {
        term: 'API',
        definition: '应用程序编程接口，定义了软件组件之间如何交互的规则',
        difficulty: 'basic',
        relatedTerms: ['REST', 'GraphQL', 'Endpoint'],
      },
      {
        term: 'REST',
        definition: '代表性状态传输，一种基于HTTP的架构风格，用于设计网络应用程序',
        difficulty: 'intermediate',
        relatedTerms: ['API', 'HTTP', 'Resource'],
      },
      {
        term: '机器学习',
        definition: '人工智能的一个分支，让计算机能够从数据中学习而无需明确编程',
        difficulty: 'basic',
        relatedTerms: ['深度学习', '神经网络', '训练数据'],
      },
      {
        term: '深度学习',
        definition: '机器学习的一种，使用多层神经网络模拟人脑处理数据的方式',
        difficulty: 'intermediate',
        relatedTerms: ['神经网络', '反向传播', '卷积'],
      },
    ];

    for (const term of defaultTerms) {
      this.termDatabase.set(term.term.toLowerCase(), term);
    }
  }

  /**
   * 主要内容适配入口
   * @param rawContent 原始内容
   * @param profile 用户认知画像
   * @param options 适配选项
   * @returns 适配后的内容
   */
  async adapt(
    rawContent: RawContent,
    profile: CognitiveProfile,
    options: AdaptationOptions = DEFAULT_ADAPTATION_OPTIONS,
  ): Promise<AdaptationResult> {
    this.logger.debug(`Adapting content ${rawContent.id} for user ${profile.userId}`);

    // 1. 确定目标信息密度
    const targetDensity = this.determineTargetDensity(profile, options);

    // 2. 分析内容复杂度
    const complexity = rawContent.complexity || await this.analyzeComplexity(rawContent);

    // 3. 提取并处理术语
    const termExtraction = await this.extractTerms(rawContent, profile);

    // 4. 内容分块
    const chunks = await this.chunkContent(rawContent, termExtraction, options);

    // 5. 应用难度调整
    const adaptedChunks = this.adaptChunksToDensity(chunks, targetDensity, profile);

    // 6. 应用渐进披露层级
    const leveledChunks = this.applyDisclosureLevels(adaptedChunks, profile, options);

    // 7. 构建层级结构
    const hierarchy = this.buildHierarchy(leveledChunks);

    // 8. 评估认知负荷
    const assessment = this.assessCognitiveLoad(leveledChunks, profile, complexity);

    // 9. 组装最终结果
    const adaptedContent: AdaptedContent = {
      meta: {
        originalId: rawContent.id,
        adaptedAt: new Date(),
        profileVersion: profile.version,
        targetDensity,
      },
      structure: {
        chunks: leveledChunks,
        hierarchy,
        totalReadTime: this.calculateTotalReadTime(leveledChunks, profile),
        disclosureLevels: this.countByDisclosureLevel(leveledChunks),
      },
      adaptations: {
        density: targetDensity,
        termsAdded: termExtraction.unknownTerms.length,
        termsRemoved: options.terminology?.removeKnown ? termExtraction.knownTerms.length : 0,
        chunksSplit: chunks.length,
        chunksMerged: 0, // TODO: 实现合并逻辑
      },
      original: {
        title: rawContent.title,
        summary: rawContent.summary || '',
        complexity,
      },
    };

    return {
      adapted: adaptedContent,
      assessment,
    };
  }

  /**
   * 快速预览适配效果
   */
  async preview(
    rawContent: RawContent,
    profile: CognitiveProfile,
    options: AdaptationOptions = DEFAULT_ADAPTATION_OPTIONS,
  ): Promise<AdaptationPreview> {
    const complexity = rawContent.complexity || await this.analyzeComplexity(rawContent);
    const targetDensity = this.determineTargetDensity(profile, options);
    const termExtraction = await this.extractTerms(rawContent, profile);

    // 预估分块数量
    const estimatedChunks = Math.ceil(rawContent.content.length / (options.chunking?.maxChunkSize || 500));

    // 预估各级别内容分布
    const disclosureDistribution: Record<DisclosureLevel, number> = {
      [DisclosureLevel.L1]: Math.ceil(estimatedChunks * 0.2),
      [DisclosureLevel.L2]: Math.ceil(estimatedChunks * 0.4),
      [DisclosureLevel.L3]: Math.ceil(estimatedChunks * 0.3),
      [DisclosureLevel.L4]: Math.ceil(estimatedChunks * 0.1),
    };

    return {
      originalComplexity: complexity,
      targetDensity,
      estimatedReadTime: this.estimateReadTime(rawContent.content, targetDensity),
      termCount: {
        total: termExtraction.terms.length,
        toExplain: termExtraction.unknownTerms.length,
        toRemove: termExtraction.knownTerms.length,
      },
      chunkCount: {
        total: estimatedChunks,
        byLevel: disclosureDistribution,
      },
      cognitiveLoad: this.assessCognitiveLoad([], profile, complexity),
    };
  }

  /**
   * 确定目标信息密度
   */
  private determineTargetDensity(
    profile: CognitiveProfile,
    options: AdaptationOptions,
  ): InformationDensity {
    // 如果指定了固定密度，直接使用
    if (options.density?.target) {
      return options.density.target;
    }

    // 基于用户专业水平
    const domainExpertise = profile.expertise.find(
      e => profile.context.currentTopic?.includes(e.domain),
    );
    const expertiseLevel = domainExpertise?.level || ExpertiseLevel.INTERMEDIATE;
    let density = EXPERTISE_DENSITY_MAP[expertiseLevel];

    // 根据精力状态调整
    if (options.cognitiveLoad?.optimizeForEnergy) {
      if (profile.context.energyLevel === EnergyLevel.LOW) {
        density = InformationDensity.SPARSE;
      } else if (profile.context.energyLevel === EnergyLevel.HIGH && expertiseLevel === ExpertiseLevel.EXPERT) {
        density = InformationDensity.DENSE;
      }
    }

    // 根据时间约束调整
    if (options.cognitiveLoad?.respectTimeConstraint && profile.context.availableTime < 5) {
      density = InformationDensity.SPARSE;
    }

    return density;
  }

  /**
   * 分析内容复杂度
   */
  private async analyzeComplexity(content: RawContent): Promise<ComplexityScore> {
    const text = content.content;

    // 词汇复杂度分析
    const vocabulary = this.analyzeVocabularyComplexity(text);

    // 概念复杂度分析 (基于术语密度、抽象词等)
    const conceptual = this.analyzeConceptualComplexity(text);

    // 结构复杂度分析
    const structural = this.analyzeStructuralComplexity(text);

    // 前置知识要求
    const prerequisite = this.analyzePrerequisiteLevel(text);

    // 计算整体复杂度
    const overall = (vocabulary + conceptual + structural + prerequisite) / 4;

    return {
      overall,
      vocabulary,
      conceptual,
      structural,
      prerequisite,
    };
  }

  /**
   * 分析词汇复杂度
   */
  private analyzeVocabularyComplexity(text: string): number {
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const words: string[] = text.toLowerCase().match(/\b\w+\b/g) || [];
    const totalWords = words.length;

    if (totalWords === 0) return 0;

    // 计算平均词长
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / totalWords;

    // 计算平均句长
    const avgSentenceLength = totalWords / sentences.length;

    // 标准化到 0-1
    const wordLengthScore = Math.min(avgWordLength / 8, 1); // 假设8个字符为复杂
    const sentenceLengthScore = Math.min(avgSentenceLength / 30, 1); // 假设30个词为长句

    return (wordLengthScore * 0.5 + sentenceLengthScore * 0.5);
  }

  /**
   * 分析概念复杂度
   */
  private analyzeConceptualComplexity(text: string): number {
    // 检测术语密度
    const termMatches = this.findTermsInText(text);
    const termDensity = termMatches.length / (text.length / 1000); // 每千字术语数

    // 检测抽象概念指示词
    const abstractIndicators = [
      '理论', '概念', '框架', '模型', '范式',
      'theory', 'concept', 'framework', 'model', 'paradigm',
    ];
    const abstractCount = abstractIndicators.reduce((count, indicator) => {
      const regex = new RegExp(indicator, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    const termScore = Math.min(termDensity / 10, 1); // 假设10个术语/千字为高
    const abstractScore = Math.min(abstractCount / 5, 1); // 假设5个抽象指示词为高

    return (termScore * 0.6 + abstractScore * 0.4);
  }

  /**
   * 分析结构复杂度
   */
  private analyzeStructuralComplexity(text: string): number {
    // 检测段落层级深度
    const headingMatches: string[] = text.match(/^(#{1,6}|\d+\.|\[Level \d+\])/gm) || [];
    const maxLevel = headingMatches.reduce((max, h) => {
      if (h.startsWith('#')) {
        return Math.max(max, h.length);
      }
      return max;
    }, 1);

    // 检测嵌套结构
    const nestedListMatches: string[] = text.match(/^[\s]*[-*\d]\..*$/gm) || [];
    const nestingDepth = nestedListMatches.reduce((max, line) => {
      const indent = line.match(/^[\s]*/)?.[0].length || 0;
      return Math.max(max, Math.floor(indent / 2));
    }, 0);

    const levelScore = Math.min(maxLevel / 6, 1);
    const nestingScore = Math.min(nestingDepth / 4, 1);

    return (levelScore * 0.6 + nestingScore * 0.4);
  }

  /**
   * 分析前置知识要求
   */
  private analyzePrerequisiteLevel(text: string): number {
    // 检测前置知识指示词
    const prerequisiteIndicators = [
      '假设', '前提', '基础', '了解', '熟悉', '掌握',
      'assume', 'prerequisite', 'foundation', 'familiar', 'knowledge of',
    ];

    const indicatorCount = prerequisiteIndicators.reduce((count, indicator) => {
      const regex = new RegExp(indicator, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return Math.min(indicatorCount / 3, 1); // 假设3个指示词为高要求
  }

  /**
   * 提取并分类术语
   */
  private async extractTerms(
    content: RawContent,
    profile: CognitiveProfile,
  ): Promise<TermExtraction> {
    const foundTerms = this.findTermsInText(content.content);
    const providedTerms = content.terms || [];

    // 合并提取的术语和提供的术语
    const allTerms = [...foundTerms, ...providedTerms];
    const uniqueTerms = this.deduplicateTerms(allTerms);

    // 分类术语
    const knownTerms: string[] = [];
    const unknownTerms: string[] = [];
    const domainExpertise = profile.expertise.find(
      e => profile.context.currentTopic?.includes(e.domain),
    );

    for (const term of uniqueTerms) {
      const isKnown = domainExpertise?.knownConcepts.includes(term.term) ||
        this.isCommonTerm(term.term);

      if (isKnown) {
        knownTerms.push(term.term);
      } else {
        unknownTerms.push(term.term);
      }
    }

    return {
      terms: uniqueTerms,
      unknownTerms,
      knownTerms,
      domainTerms: uniqueTerms.filter(t => t.difficulty === 'advanced'),
    };
  }

  /**
   * 在文本中查找术语
   */
  private findTermsInText(text: string): TermDefinition[] {
    const foundTerms: TermDefinition[] = [];

    for (const [key, definition] of this.termDatabase.entries()) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      if (regex.test(text)) {
        foundTerms.push(definition);
      }
    }

    return foundTerms;
  }

  /**
   * 术语去重
   */
  private deduplicateTerms(terms: TermDefinition[]): TermDefinition[] {
    const seen = new Set<string>();
    return terms.filter(term => {
      if (seen.has(term.term.toLowerCase())) {
        return false;
      }
      seen.add(term.term.toLowerCase());
      return true;
    });
  }

  /**
   * 判断是否为常见术语
   */
  private isCommonTerm(term: string): boolean {
    const commonTerms = [
      'api', 'http', 'url', 'app', 'web', 'ai', 'ml',
      '数据', '信息', '系统', '用户', '功能',
    ];
    return commonTerms.includes(term.toLowerCase());
  }

  /**
   * 内容分块
   */
  private async chunkContent(
    content: RawContent,
    termExtraction: TermExtraction,
    options: AdaptationOptions,
  ): Promise<ContentChunk[]> {
    const maxChunkSize = options.chunking?.maxChunkSize || 500;
    const preserveParagraphs = options.chunking?.preserveParagraphs !== false;

    const chunks: ContentChunk[] = [];
    const paragraphs = preserveParagraphs
      ? content.content.split(/\n\n+/)
      : [content.content];

    let chunkId = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;

      // 如果段落太长，进一步拆分
      if (paragraph.length > maxChunkSize) {
        const subChunks = this.splitLongParagraph(paragraph, maxChunkSize);
        for (const subChunk of subChunks) {
          chunks.push(this.createChunk(
            `chunk-${chunkId++}`,
            subChunk,
            termExtraction.terms,
            options,
          ));
        }
      } else {
        chunks.push(this.createChunk(
          `chunk-${chunkId++}`,
          paragraph,
          termExtraction.terms,
          options,
        ));
      }
    }

    return chunks;
  }

  /**
   * 拆分长段落
   */
  private splitLongParagraph(paragraph: string, maxSize: number): string[] {
    const chunks: string[] = [];
    const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * 创建内容块
   */
  private createChunk(
    id: string,
    content: string,
    allTerms: TermDefinition[],
    options: AdaptationOptions,
  ): ContentChunk {
    // 检测块类型
    const type = this.detectChunkType(content);

    // 提取块中包含的术语
    const chunkTerms = allTerms.filter(term =>
      content.toLowerCase().includes(term.term.toLowerCase())
    );

    // 计算块复杂度
    const complexity: ComplexityScore = {
      overall: 0.5,
      vocabulary: this.analyzeVocabularyComplexity(content),
      conceptual: this.analyzeConceptualComplexity(content),
      structural: 0.3,
      prerequisite: 0.4,
    };

    return {
      id,
      type,
      level: 1,
      content,
      adaptedContent: content,
      complexity,
      terms: chunkTerms,
      disclosureLevel: DisclosureLevel.L1,
      estimatedReadTime: this.estimateChunkReadTime(content),
    };
  }

  /**
   * 检测内容块类型
   */
  private detectChunkType(content: string): ContentChunk['type'] {
    if (/^#{1,6}\s/.test(content)) return 'heading';
    if (/^```/.test(content)) return 'code';
    if (/^\s*[-*]\s/.test(content)) return 'list';
    if (/^\s*\d+\.\s/.test(content)) return 'list';
    if (/^>\s/.test(content)) return 'quote';
    if (/[\^\{\}\[\]]/.test(content) && /[=\+\-\*/]$/.test(content)) return 'formula';
    return 'paragraph';
  }

  /**
   * 估算块阅读时间
   */
  private estimateChunkReadTime(content: string): number {
    // 假设平均阅读速度 200 字/分钟
    const charCount = content.length;
    const words = charCount > 100 ? charCount / 2 : charCount; // 中文字符按1个算，英文按2个算一个词
    const minutes = words / 200;
    return Math.max(1, Math.ceil(minutes * 60)); // 返回秒数
  }

  /**
   * 根据目标密度调整内容块
   */
  private adaptChunksToDensity(
    chunks: ContentChunk[],
    targetDensity: InformationDensity,
    profile: CognitiveProfile,
  ): ContentChunk[] {
    return chunks.map(chunk => {
      let adaptedContent = chunk.content;

      switch (targetDensity) {
        case InformationDensity.SPARSE:
          // 新手模式：添加术语解释，简化句子
          adaptedContent = this.simplifyForNovice(chunk, profile);
          break;
        case InformationDensity.MODERATE:
          // 进阶模式：选择性添加术语解释
          adaptedContent = this.adaptForIntermediate(chunk, profile);
          break;
        case InformationDensity.DENSE:
          // 专家模式：保持原样，可能移除已知术语的解释
          adaptedContent = this.optimizeForExpert(chunk, profile);
          break;
      }

      return {
        ...chunk,
        adaptedContent,
      };
    });
  }

  /**
   * 为新手简化内容
   */
  private simplifyForNovice(chunk: ContentChunk, profile: CognitiveProfile): string {
    let content = chunk.content;

    // 为未知术语添加解释
    for (const term of chunk.terms) {
      if (!this.isTermKnown(term.term, profile)) {
        const explanation = this.generateTermExplanation(term, 'novice');
        content = content.replace(
          new RegExp(`\\b${term.term}\\b`, 'gi'),
          `${term.term}(${explanation})`
        );
      }
    }

    // 简化长句
    content = this.simplifySentences(content);

    return content;
  }

  /**
   * 为进阶用户调整内容
   */
  private adaptForIntermediate(chunk: ContentChunk, profile: CognitiveProfile): string {
    let content = chunk.content;

    // 只为高级术语添加解释
    for (const term of chunk.terms) {
      if (term.difficulty === 'advanced' && !this.isTermKnown(term.term, profile)) {
        const explanation = this.generateTermExplanation(term, 'intermediate');
        content = content.replace(
          new RegExp(`\\b${term.term}\\b`, 'g'),
          `${term.term}(${explanation})`
        );
      }
    }

    return content;
  }

  /**
   * 为专家优化内容
   */
  private optimizeForExpert(chunk: ContentChunk, profile: CognitiveProfile): string {
    let content = chunk.content;

    // 移除已知术语的解释 (在实际实现中，可能需要标记而非直接移除)
    for (const term of chunk.terms) {
      if (this.isTermKnown(term.term, profile)) {
        // 专家模式下，术语保持原样
        continue;
      }
    }

    return content;
  }

  /**
   * 判断用户是否已知某术语
   */
  private isTermKnown(term: string, profile: CognitiveProfile): boolean {
    return profile.expertise.some(
      e => e.knownConcepts.includes(term.toLowerCase())
    ) || this.isCommonTerm(term);
  }

  /**
   * 生成术语解释
   */
  private generateTermExplanation(
    term: TermDefinition,
    level: 'novice' | 'intermediate',
  ): string {
    if (level === 'novice') {
      return term.definition;
    }
    // 进阶模式简要解释
    return term.definition.split('，')[0] + '...';
  }

  /**
   * 简化句子
   */
  private simplifySentences(content: string): string {
    // 简单的句子简化策略
    return content
      .replace(/，/g, '。') // 拆分长句
      .replace(/；/g, '。')
      .replace(/然而/g, '但是')
      .replace(/因此/g, '所以');
  }

  /**
   * 应用渐进披露层级
   */
  private applyDisclosureLevels(
    chunks: ContentChunk[],
    profile: CognitiveProfile,
    options: AdaptationOptions,
  ): ContentChunk[] {
    const enableProgressive = options.disclosure?.enableProgressive !== false;
    if (!enableProgressive) {
      return chunks.map(c => ({ ...c, disclosureLevel: DisclosureLevel.L1 }));
    }

    // 根据内容重要性和用户画像分配披露层级
    return chunks.map((chunk, index) => {
      let level = DisclosureLevel.L1;

      // 开头内容通常是核心
      if (index < chunks.length * 0.2) {
        level = DisclosureLevel.L1;
      }
      // 中间内容通常是详细解释
      else if (index < chunks.length * 0.6) {
        level = DisclosureLevel.L2;
      }
      // 后续是深入内容
      else if (index < chunks.length * 0.9) {
        level = DisclosureLevel.L3;
      }
      // 最后是原始资料
      else {
        level = DisclosureLevel.L4;
      }

      // 根据用户目标调整
      if (profile.context.goal === UserGoal.OVERVIEW) {
        level = DisclosureLevel.L1; // 概览模式只显示L1
      } else if (profile.context.goal === UserGoal.RESEARCH) {
        // 研究模式降低层级
        level = this.lowerDisclosureLevel(level);
      }

      return {
        ...chunk,
        disclosureLevel: level,
      };
    });
  }

  /**
   * 降低披露层级 (显示更多内容)
   */
  private lowerDisclosureLevel(level: DisclosureLevel): DisclosureLevel {
    const levels = [DisclosureLevel.L1, DisclosureLevel.L2, DisclosureLevel.L3, DisclosureLevel.L4];
    const index = levels.indexOf(level);
    return levels[Math.max(0, index - 1)] || DisclosureLevel.L1;
  }

  /**
   * 构建层级结构
   */
  private buildHierarchy(chunks: ContentChunk[]): ChunkHierarchy {
    const rootChunkIds: string[] = [];
    const levelDistribution: Record<number, number> = {};
    let maxDepth = 1;

    for (const chunk of chunks) {
      if (chunk.level === 1) {
        rootChunkIds.push(chunk.id);
      }

      levelDistribution[chunk.level] = (levelDistribution[chunk.level] || 0) + 1;
      maxDepth = Math.max(maxDepth, chunk.level);
    }

    return {
      rootChunkIds,
      levelDistribution,
      maxDepth,
    };
  }

  /**
   * 评估认知负荷
   */
  private assessCognitiveLoad(
    chunks: ContentChunk[],
    profile: CognitiveProfile,
    contentComplexity: ComplexityScore,
  ): CognitiveLoadAssessment {
    // 内在负荷 (内容本身复杂度)
    const intrinsic = contentComplexity.overall;

    // 外在负荷 (呈现方式复杂度)
    const extraneous = this.calculateExtraneousLoad(chunks, profile);

    // 关联负荷 (有益的学习投入)
    const germane = this.calculateGermaneLoad(chunks, profile);

    // 总负荷
    const total = intrinsic + extraneous;

    // 风险评估
    let risk: CognitiveLoadAssessment['risk'] = 'low';
    if (total > 0.9 || (profile.context.energyLevel === EnergyLevel.LOW && total > 0.6)) {
      risk = 'overload';
    } else if (total > 0.7 || (profile.context.energyLevel === EnergyLevel.LOW && total > 0.5)) {
      risk = 'high';
    } else if (total > 0.5) {
      risk = 'moderate';
    }

    // 生成建议
    const recommendations = this.generateLoadRecommendations(risk, total, profile);

    return {
      intrinsic,
      extraneous,
      germane,
      total,
      risk,
      recommendations,
    };
  }

  /**
   * 计算外在负荷
   */
  private calculateExtraneousLoad(
    chunks: ContentChunk[],
    profile: CognitiveProfile,
  ): number {
    // 基于呈现复杂度计算
    const chunkCount = chunks.length;
    const avgComplexity = chunks.reduce((sum, c) => sum + c.complexity.overall, 0) / (chunkCount || 1);

    // 结构复杂度
    const structuralLoad = Math.min(chunkCount / 20, 1) * 0.3; // 过多分块增加负荷

    // 格式复杂度
    const formatLoad = avgComplexity * 0.3;

    // 术语密度
    const termDensity = chunks.reduce((sum, c) => sum + c.terms.length, 0) / (chunkCount || 1);
    const termLoad = Math.min(termDensity / 5, 1) * 0.4;

    return structuralLoad + formatLoad + termLoad;
  }

  /**
   * 计算关联负荷
   */
  private calculateGermaneLoad(
    chunks: ContentChunk[],
    profile: CognitiveProfile,
  ): number {
    // 关联负荷取决于内容对用户的价值
    const expertiseRelevance = profile.expertise.some(
      e => profile.context.currentTopic?.includes(e.domain)
    ) ? 0.8 : 0.4;

    const goalAlignment = profile.context.goal === UserGoal.LEARN ? 0.9 :
      profile.context.goal === UserGoal.RESEARCH ? 0.8 : 0.5;

    return (expertiseRelevance + goalAlignment) / 2;
  }

  /**
   * 生成负荷优化建议
   */
  private generateLoadRecommendations(
    risk: CognitiveLoadAssessment['risk'],
    totalLoad: number,
    profile: CognitiveProfile,
  ): string[] {
    const recommendations: string[] = [];

    if (risk === 'overload' || risk === 'high') {
      recommendations.push('建议将内容拆分为多个会话阅读');
      recommendations.push('建议优先阅读核心内容(L1层级)');

      if (profile.context.energyLevel === EnergyLevel.LOW) {
        recommendations.push('当前精力状态较低，建议休息后再阅读');
      }
    }

    if (totalLoad > 0.6 && profile.context.availableTime < 10) {
      recommendations.push('时间有限，建议切换至概览模式');
    }

    if (recommendations.length === 0) {
      recommendations.push('当前内容复杂度适中，适合当前状态阅读');
    }

    return recommendations;
  }

  /**
   * 计算总阅读时间
   */
  private calculateTotalReadTime(chunks: ContentChunk[], profile: CognitiveProfile): number {
    const baseTime = chunks.reduce((sum, c) => sum + c.estimatedReadTime, 0);

    // 根据阅读节奏调整
    const paceMultiplier = profile.preference?.pace === 'quick' ? 0.8 :
      profile.preference?.pace === 'thorough' ? 1.3 : 1.0;

    return Math.round(baseTime * paceMultiplier);
  }

  /**
   * 估算阅读时间
   */
  private estimateReadTime(content: string, density: InformationDensity): number {
    const charCount = content.length;
    const words = charCount > 100 ? charCount / 2 : charCount;
    const baseMinutes = words / 200;

    const densityMultiplier = density === InformationDensity.SPARSE ? 0.7 :
      density === InformationDensity.DENSE ? 1.3 : 1.0;

    return Math.round(baseMinutes * densityMultiplier * 60);
  }

  /**
   * 统计各级别披露内容数量
   */
  private countByDisclosureLevel(chunks: ContentChunk[]): Record<DisclosureLevel, number> {
    const counts: Record<DisclosureLevel, number> = {
      [DisclosureLevel.L1]: 0,
      [DisclosureLevel.L2]: 0,
      [DisclosureLevel.L3]: 0,
      [DisclosureLevel.L4]: 0,
    };

    for (const chunk of chunks) {
      counts[chunk.disclosureLevel]++;
    }

    return counts;
  }

  /**
   * 注册新术语到数据库
   */
  registerTerm(term: TermDefinition): void {
    this.termDatabase.set(term.term.toLowerCase(), term);
  }

  /**
   * 批量注册术语
   */
  registerTerms(terms: TermDefinition[]): void {
    for (const term of terms) {
      this.registerTerm(term);
    }
  }

  /**
   * 获取术语定义
   */
  getTermDefinition(term: string): TermDefinition | undefined {
    return this.termDatabase.get(term.toLowerCase());
  }
}
