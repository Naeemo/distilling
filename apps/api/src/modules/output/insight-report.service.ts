// ============================================================
// 洞察报告服务 (Insight Report Service)
// 高价值信息产出：将碎片化信息转化为结构化洞察
// ============================================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import {
  InsightReport,
  ExecutiveSummary,
  KeyFinding,
  ActionRecommendation,
  ReportBody,
  ThemeAnalysis,
  Timeline,
  TimelineEvent,
  ComparisonAnalysis,
  KnowledgeNetwork,
  NetworkNode,
  NetworkEdge,
  DeepDive,
  FollowUpQuestion,
  UnresolvedDebate,
  TrendPrediction,
  ReportGenerationOptions,
  ReportGenerationInput,
  ReportPreview,
  ReportQuality,
  DEFAULT_REPORT_OPTIONS,
  ReportTemplate,
  TEMPLATE_CONFIGS,
} from './insight-report.types';
import { CognitiveProfile } from './user-profile.types';

/**
 * 内容洞察数据（用于报告生成）
 */
interface ContentInsightData {
  contentId: string;
  title: string;
  url?: string;
  topics: { name: string; confidence: number }[];
  keyEntities: { name: string; type: string; mentions: number }[];
  keyClaims: string[];
  sentiments?: { overall: string; score: number };
  stance?: string;
  qualityScore?: number;
  createdAt: Date;
}

/**
 * 聚合主题
 */
interface AggregatedTheme {
  name: string;
  contentIds: string[];
  totalConfidence: number;
  avgConfidence: number;
  sentiments: string[];
}

@Injectable()
export class InsightReportService {
  private readonly logger = new Logger(InsightReportService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private knowledgeGraphService: KnowledgeGraphService,
  ) {}

  // ==================== 报告生成主入口 ====================

  /**
   * 生成洞察报告
   */
  async generateReport(input: ReportGenerationInput): Promise<InsightReport> {
    const { userId, contentIds, title, scope, options = {}, profile } = input;

    this.logger.log(`Generating insight report for user ${userId} with ${contentIds.length} contents`);

    // 合并选项
    const mergedOptions = this.mergeOptions(options);

    // 1. 获取内容洞察数据
    const contents = await this.fetchContentInsights(userId, contentIds);
    if (contents.length === 0) {
      throw new NotFoundException('No content found for report generation');
    }

    // 2. 聚合主题
    const aggregatedThemes = this.aggregateThemes(contents);

    // 3. 生成执行摘要
    const executive = await this.generateExecutiveSummary(
      contents,
      aggregatedThemes,
      mergedOptions,
      profile,
    );

    // 4. 生成主体内容
    const body = await this.generateReportBody(
      contents,
      aggregatedThemes,
      mergedOptions,
      profile,
    );

    // 5. 生成深度探索
    const deepDive = await this.generateDeepDive(
      contents,
      aggregatedThemes,
      executive.keyFindings,
      mergedOptions,
      profile,
    );

    // 6. 构建报告
    const report: InsightReport = {
      id: this.generateId(),
      userId,
      meta: {
        title: title || this.generateTitle(aggregatedThemes),
        scope: scope || this.inferScope(aggregatedThemes),
        sources: contents.length,
        generatedAt: new Date(),
        version: 1,
      },
      executive,
      body,
      deepDive,
      personalization: {
        targetProfile: profile?.expertise?.[0]?.domain || 'general',
        adaptationNotes: this.generateAdaptationNotes(profile, mergedOptions),
        difficultyLevel: this.determineDifficultyLevel(profile, mergedOptions),
      },
    };

    this.logger.log(`Insight report generated: ${report.id}`);
    return report;
  }

  /**
   * 快速生成执行摘要（简化版）
   */
  async generateQuickSummary(userId: string, contentIds: string[]): Promise<ExecutiveSummary> {
    const contents = await this.fetchContentInsights(userId, contentIds);
    const aggregatedThemes = this.aggregateThemes(contents);
    
    return this.generateExecutiveSummary(
      contents,
      aggregatedThemes,
      DEFAULT_REPORT_OPTIONS,
      undefined,
    );
  }

  // ==================== 执行摘要生成 ====================

  /**
   * 生成执行摘要
   */
  private async generateExecutiveSummary(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    options: ReportGenerationOptions,
    profile?: CognitiveProfile,
  ): Promise<ExecutiveSummary> {
    // 生成关键发现
    const keyFindings = await this.generateKeyFindings(
      contents,
      themes,
      options.executive.maxFindings,
      options.executive.minConfidence,
    );

    // 生成行动建议
    const recommendations = await this.generateRecommendations(
      keyFindings,
      options.executive.maxRecommendations,
    );

    // 生成 TL;DR
    const tlDr = await this.generateTlDr(keyFindings, themes);

    return {
      tlDr,
      keyFindings,
      recommendations,
    };
  }

  /**
   * 生成关键发现
   */
  private async generateKeyFindings(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    maxFindings: number,
    minConfidence: number,
  ): Promise<KeyFinding[]> {
    const findings: KeyFinding[] = [];
    let order = 1;

    // 1. 从聚合主题中提取发现
    for (const theme of themes.slice(0, maxFindings)) {
      if (theme.avgConfidence < minConfidence) continue;

      const sentiment = this.analyzeSentiment(theme.sentiments);
      const evidence = this.extractEvidenceForTheme(contents, theme.name);

      findings.push({
        id: this.generateId(),
        order: order++,
        statement: `${theme.name}是一个${theme.avgConfidence > 0.8 ? '高度确定' : '值得注意'}的趋势，涉及${theme.contentIds.length}个来源。`,
        evidence,
        significance: theme.avgConfidence > 0.8 ? 'critical' : 'important',
        confidence: theme.avgConfidence,
        relatedThemes: themes
          .filter(t => t.name !== theme.name)
          .slice(0, 3)
          .map(t => t.name),
      });
    }

    // 2. 从内容观点冲突中提取发现
    const contradictions = this.findContradictions(contents);
    if (contradictions.length > 0 && findings.length < maxFindings) {
      findings.push({
        id: this.generateId(),
        order: order++,
        statement: `不同来源在${contradictions[0].topic}上存在显著分歧。`,
        evidence: contradictions[0].evidence,
        significance: 'important',
        confidence: 0.7,
        relatedThemes: [],
      });
    }

    // 3. 从高质量内容中提取发现
    const highQualityContents = contents
      .filter(c => (c.qualityScore || 0) > 0.8)
      .slice(0, 2);

    for (const content of highQualityContents) {
      if (findings.length >= maxFindings) break;
      if (content.keyClaims.length === 0) continue;

      findings.push({
        id: this.generateId(),
        order: order++,
        statement: content.keyClaims[0],
        evidence: [content.title],
        significance: 'notable',
        confidence: content.qualityScore || 0.7,
        relatedThemes: content.topics.slice(0, 3).map(t => t.name),
      });
    }

    return findings.slice(0, maxFindings);
  }

  /**
   * 生成行动建议
   */
  private async generateRecommendations(
    findings: KeyFinding[],
    maxRecommendations: number,
  ): Promise<ActionRecommendation[]> {
    const recommendations: ActionRecommendation[] = [];
    let order = 1;

    // 基于关键发现生成建议
    for (const finding of findings.slice(0, maxRecommendations)) {
      let action: string;
      let priority: 'immediate' | 'short_term' | 'long_term';

      switch (finding.significance) {
        case 'critical':
          action = `深入理解并跟踪${finding.relatedThemes[0] || '该领域'}的最新进展`;
          priority = 'immediate';
          break;
        case 'important':
          action = `将${finding.relatedThemes[0] || '相关信息'}纳入决策考量`;
          priority = 'short_term';
          break;
        default:
          action = `保持对${finding.relatedThemes[0] || '相关主题'}的关注`;
          priority = 'long_term';
      }

      recommendations.push({
        id: this.generateId(),
        order: order++,
        action,
        rationale: `基于发现：${finding.statement}`,
        priority,
        effort: 'low',
        impact: finding.significance === 'critical' ? 'high' : 'medium',
        relatedFindingIds: [finding.id],
      });
    }

    return recommendations.slice(0, maxRecommendations);
  }

  /**
   * 生成 TL;DR
   */
  private async generateTlDr(
    findings: KeyFinding[],
    themes: AggregatedTheme[],
  ): Promise<string> {
    if (findings.length === 0) {
      return '暂无足够信息生成摘要。';
    }

    const topFinding = findings[0];
    const topTheme = themes[0];

    return `基于${themes.length}个主题的聚合分析，核心发现是：${topFinding.statement}` +
           `${topTheme ? `最突出的主题是"${topTheme.name}"，涉及${topTheme.contentIds.length}个来源。` : ''}`;
  }

  // ==================== 主体内容生成 ====================

  /**
   * 生成报告主体内容
   */
  private async generateReportBody(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    options: ReportGenerationOptions,
    profile?: CognitiveProfile,
  ): Promise<ReportBody> {
    // 1. 生成主题分析
    const themeAnalyses = await this.generateThemeAnalyses(
      contents,
      themes,
      options.body.maxThemes,
    );

    // 2. 生成时间线（如果启用）
    let timeline: Timeline | undefined;
    if (options.body.includeTimeline) {
      timeline = this.generateTimeline(contents);
    }

    // 3. 生成对比分析（如果启用）
    let comparison: ComparisonAnalysis | undefined;
    if (options.body.includeComparison) {
      comparison = this.generateComparison(contents, themes);
    }

    // 4. 生成知识网络图
    const network = await this.generateKnowledgeNetwork(
      contents,
      themes,
      options.body.networkDepth,
    );

    return {
      themes: themeAnalyses,
      timeline,
      comparison,
      network,
    };
  }

  /**
   * 生成主题分析
   */
  private async generateThemeAnalyses(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    maxThemes: number,
  ): Promise<ThemeAnalysis[]> {
    return themes.slice(0, maxThemes).map((theme, index) => {
      const themeContents = contents.filter(c =>
        c.topics.some(t => t.name === theme.name),
      );

      const sentiment = this.analyzeSentiment(theme.sentiments);
      const keyPoints = this.extractKeyPoints(themeContents, theme.name);

      return {
        id: this.generateId(),
        name: theme.name,
        description: `关于${theme.name}的聚合分析，涉及${theme.contentIds.length}个来源。`,
        importance: theme.avgConfidence,
        coverage: theme.contentIds.length / contents.length,
        sentiment,
        keyPoints,
        relatedThemes: themes
          .filter(t => t.name !== theme.name)
          .slice(0, 3)
          .map(t => t.name),
        sourceCount: theme.contentIds.length,
        evidenceStrength: theme.avgConfidence,
      };
    });
  }

  /**
   * 生成时间线
   */
  private generateTimeline(contents: ContentInsightData[]): Timeline | undefined {
    // 按日期排序内容
    const sortedContents = [...contents].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    if (sortedContents.length < 2) {
      return undefined;
    }

    const events: TimelineEvent[] = sortedContents.map((content, index) => ({
      id: this.generateId(),
      date: content.createdAt,
      dateDisplay: this.formatDate(content.createdAt),
      title: content.title.substring(0, 50),
      description: `关于${content.topics.slice(0, 2).map(t => t.name).join('、')}的内容`,
      significance: content.qualityScore > 0.8 ? 'major' : 'minor',
      sourceIds: [content.contentId],
      relatedEvents: [],
    }));

    const startDate = sortedContents[0].createdAt;
    const endDate = sortedContents[sortedContents.length - 1].createdAt;

    return {
      title: '内容收集时间线',
      description: `从${this.formatDate(startDate)}到${this.formatDate(endDate)}收集的内容`,
      events,
      startDate,
      endDate,
      totalDuration: this.calculateDuration(startDate, endDate),
    };
  }

  /**
   * 生成对比分析
   */
  private generateComparison(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
  ): ComparisonAnalysis | undefined {
    // 寻找有不同观点的内容
    const contentsWithStance = contents.filter(c => c.stance);
    if (contentsWithStance.length < 2) {
      return undefined;
    }

    const stances = [...new Set(contentsWithStance.map(c => c.stance!))];
    if (stances.length < 2) {
      return undefined;
    }

    // 基于前两个主要立场创建对比
    const subjects = stances.slice(0, 2);
    const dimensions = themes.slice(0, 3).map(theme => {
      const subjectData: Record<string, { score?: number; description: string; evidence: string[] }> = {};

      subjects.forEach(stance => {
        const stanceContents = contents.filter(
          c => c.stance === stance && c.topics.some(t => t.name === theme.name),
        );

        subjectData[stance] = {
          score: stanceContents.reduce((sum, c) => sum + (c.qualityScore || 0), 0) /
                 Math.max(stanceContents.length, 1),
          description: `${stanceContents.length}个来源提及`,
          evidence: stanceContents.map(c => c.title),
        };
      });

      return {
        name: theme.name,
        description: `关于${theme.name}的不同观点`,
        subjects: subjectData,
      };
    });

    return {
      id: this.generateId(),
      title: `${subjects[0]} vs ${subjects[1]} 观点对比`,
      subjects,
      dimensions,
      conclusion: `不同立场在主要主题上存在${dimensions.length}个维度的分歧。`,
      recommendation: '建议综合各方观点，形成自己的判断。',
    };
  }

  /**
   * 生成知识网络图
   */
  private async generateKnowledgeNetwork(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    depth: 'surface' | 'medium' | 'deep',
  ): Promise<KnowledgeNetwork> {
    const nodes: NetworkNode[] = [];
    const edges: NetworkEdge[] = [];
    const clusters: KnowledgeNetwork['clusters'] = [];

    // 1. 添加主题节点
    const maxThemeNodes = depth === 'surface' ? 10 : depth === 'medium' ? 20 : 30;
    themes.slice(0, maxThemeNodes).forEach((theme, index) => {
      nodes.push({
        id: `theme-${index}`,
        label: theme.name,
        type: 'theme',
        size: 10 + theme.avgConfidence * 20,
        color: this.getThemeColor(index),
        metadata: { confidence: theme.avgConfidence },
      });
    });

    // 2. 添加实体节点
    const allEntities = contents.flatMap(c => c.keyEntities);
    const uniqueEntities = [...new Set(allEntities.map(e => e.name))];
    const maxEntityNodes = depth === 'surface' ? 5 : depth === 'medium' ? 10 : 20;

    uniqueEntities.slice(0, maxEntityNodes).forEach((entityName, index) => {
      const entity = allEntities.find(e => e.name === entityName)!;
      nodes.push({
        id: `entity-${index}`,
        label: entity.name,
        type: 'entity',
        size: 8 + (entity.mentions / 10) * 12,
        metadata: { type: entity.type, mentions: entity.mentions },
      });
    });

    // 3. 添加来源节点
    contents.forEach((content, index) => {
      nodes.push({
        id: `source-${index}`,
        label: content.title.substring(0, 30),
        type: 'source',
        size: 6 + (content.qualityScore || 0.5) * 8,
        metadata: { quality: content.qualityScore },
      });
    });

    // 4. 创建边（主题-实体关联）
    contents.forEach((content, contentIndex) => {
      content.topics.forEach((topic, topicIndex) => {
        const themeIndex = themes.findIndex(t => t.name === topic.name);
        if (themeIndex >= 0) {
          // 主题到来源的连接
          edges.push({
            id: `edge-${edges.length}`,
            source: `theme-${themeIndex}`,
            target: `source-${contentIndex}`,
            type: 'relates',
            strength: topic.confidence,
          });
        }
      });
    });

    // 5. 创建聚类
    const themeClusterNodes = nodes.filter(n => n.type === 'theme').map(n => n.id);
    if (themeClusterNodes.length > 0) {
      clusters.push({
        id: 'cluster-themes',
        name: '主题',
        nodeIds: themeClusterNodes,
        color: '#4ECDC4',
      });
    }

    return {
      title: '知识网络图',
      description: `展示了${nodes.length}个节点和${edges.length}个关联的知识网络`,
      nodes,
      edges,
      clusters,
      layout: 'force',
    };
  }

  // ==================== 深度探索生成 ====================

  /**
   * 生成深度探索内容
   */
  private async generateDeepDive(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    keyFindings: KeyFinding[],
    options: ReportGenerationOptions,
    profile?: CognitiveProfile,
  ): Promise<DeepDive> {
    const questions = await this.generateFollowUpQuestions(
      contents,
      themes,
      keyFindings,
      options.deepDive.maxQuestions,
    );

    const debates = await this.generateDebates(
      contents,
      themes,
      options.deepDive.maxDebates,
    );

    const predictions = await this.generatePredictions(
      contents,
      themes,
      keyFindings,
      options.deepDive.maxPredictions,
      options.deepDive.includeSpeculative,
    );

    return {
      questions,
      debates,
      predictions,
    };
  }

  /**
   * 生成值得追问的问题
   */
  private async generateFollowUpQuestions(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    findings: KeyFinding[],
    maxQuestions: number,
  ): Promise<FollowUpQuestion[]> {
    const questions: FollowUpQuestion[] = [];

    // 基于未覆盖的主题生成问题
    const uncoveredThemes = themes.slice(3);
    for (let i = 0; i < Math.min(uncoveredThemes.length, 2); i++) {
      questions.push({
        id: this.generateId(),
        question: `${uncoveredThemes[i].name}的长期影响是什么？`,
        context: '该主题被提及但缺乏深入分析',
        potentialValue: '可能揭示隐藏的风险或机会',
        difficulty: 'medium',
        suggestedApproach: '搜索学术文献和行业报告',
        relatedFindingIds: [],
      });
    }

    // 基于发现生成问题
    for (const finding of findings.slice(0, 2)) {
      questions.push({
        id: this.generateId(),
        question: `什么因素可能导致${finding.statement.substring(0, 30)}...发生变化？`,
        context: '关键发现的边界条件不明确',
        potentialValue: '识别潜在的风险因素',
        difficulty: 'hard',
        suggestedApproach: '进行情景分析',
        relatedFindingIds: [finding.id],
      });
    }

    // 补充通用问题
    while (questions.length < maxQuestions) {
      questions.push({
        id: this.generateId(),
        question: `还有哪些相关领域值得关注？`,
        context: '当前分析可能遗漏相关主题',
        potentialValue: '扩展知识边界',
        difficulty: 'easy',
        suggestedApproach: '探索相关标签和话题',
        relatedFindingIds: [],
      });
    }

    return questions.slice(0, maxQuestions);
  }

  /**
   * 生成未解决的争议
   */
  private async generateDebates(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    maxDebates: number,
  ): Promise<UnresolvedDebate[]> {
    const debates: UnresolvedDebate[] = [];

    // 寻找有分歧的主题
    const contentsWithStance = contents.filter(c => c.stance);
    if (contentsWithStance.length >= 2) {
      const stances = [...new Set(contentsWithStance.map(c => c.stance!))];
      if (stances.length >= 2) {
        const topic = themes[0]?.name || '该话题';
        debates.push({
          id: this.generateId(),
          topic: `${topic}的主流观点分歧`,
          description: `不同来源对${topic}持有不同立场`,
          positions: stances.slice(0, 2).map(stance => ({
            side: stance,
            argument: `持${stance}立场的来源认为...`,
            supporters: contentsWithStance
              .filter(c => c.stance === stance)
              .map(c => c.title),
            evidence: contentsWithStance
              .filter(c => c.stance === stance)
              .flatMap(c => c.keyClaims.slice(0, 2)),
          })),
          whyUnresolved: '缺乏足够的高质量证据',
          potentialResolution: '需要更多数据和研究',
          significance: 'interpretive',
        });
      }
    }

    // 基于置信度低的发现生成争议
    const lowConfidenceThemes = themes.filter(t => t.avgConfidence < 0.6);
    if (lowConfidenceThemes.length > 0 && debates.length < maxDebates) {
      debates.push({
        id: this.generateId(),
        topic: `${lowConfidenceThemes[0].name}的证据充分性`,
        description: '现有来源对该主题的信息质量参差不齐',
        positions: [
          {
            side: '支持',
            argument: '有多个来源提及，值得关注',
            supporters: lowConfidenceThemes[0].contentIds.slice(0, 2),
            evidence: ['多来源提及'],
          },
          {
            side: '质疑',
            argument: '信息质量不高，置信度低',
            supporters: [],
            evidence: ['缺乏高质量来源'],
          },
        ],
        whyUnresolved: '信息来源质量差异大',
        potentialResolution: '寻找更多权威来源',
        significance: 'methodological',
      });
    }

    return debates.slice(0, maxDebates);
  }

  /**
   * 生成趋势预测
   */
  private async generatePredictions(
    contents: ContentInsightData[],
    themes: AggregatedTheme[],
    findings: KeyFinding[],
    maxPredictions: number,
    includeSpeculative: boolean,
  ): Promise<TrendPrediction[]> {
    const predictions: TrendPrediction[] = [];

    // 基于高置信度主题生成预测
    const highConfidenceThemes = themes.filter(t => t.avgConfidence > 0.7);
    for (const theme of highConfidenceThemes.slice(0, 2)) {
      predictions.push({
        id: this.generateId(),
        trend: `${theme.name}将持续受到关注`,
        timeframe: 'medium',
        confidence: theme.avgConfidence * 0.8,
        supportingEvidence: [`${theme.contentIds.length}个来源提及`, '置信度高'],
        counterIndicators: ['可能受新信息影响'],
        implications: ['需要持续关注', '可能影响相关决策'],
        keyVariables: ['新数据出现', '政策变化'],
      });
    }

    // 基于关键发现生成预测
    for (const finding of findings.filter(f => f.confidence > 0.7).slice(0, 2)) {
      predictions.push({
        id: this.generateId(),
        trend: `${finding.statement.substring(0, 40)}...将进一步发展`,
        timeframe: 'near',
        confidence: finding.confidence * 0.7,
        supportingEvidence: finding.evidence,
        counterIndicators: ['存在不确定性'],
        implications: ['可能需要调整策略'],
        keyVariables: ['相关条件变化'],
      });
    }

    // 如果需要推测性内容
    if (includeSpeculative && predictions.length < maxPredictions) {
      predictions.push({
        id: this.generateId(),
        trend: `可能出现与${themes[0]?.name || '当前主题'}相关的新发展`,
        timeframe: 'long',
        confidence: 0.4,
        supportingEvidence: ['历史模式相似'],
        counterIndicators: ['高度不确定', '信息不足'],
        implications: ['保持关注', '准备应对'],
        keyVariables: ['技术发展', '市场变化', '政策影响'],
      });
    }

    return predictions.slice(0, maxPredictions);
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取内容洞察数据
   */
  private async fetchContentInsights(
    userId: string,
    contentIds: string[],
  ): Promise<ContentInsightData[]> {
    const contents = await this.prisma.content.findMany({
      where: {
        id: { in: contentIds },
        userId,
      },
      include: {
        insights: true,
      },
    });

    return contents.map(content => ({
      contentId: content.id,
      title: content.title,
      url: content.url || undefined,
      topics: (content.insights?.topics as any[]) || [],
      keyEntities: (content.insights?.keyEntities as any[]) || [],
      keyClaims: (content.insights?.keyClaims as any[]) || [],
      sentiments: content.insights?.sentiments as any,
      stance: content.insights?.stance || undefined,
      qualityScore: content.insights?.qualityScore || undefined,
      createdAt: content.createdAt,
    }));
  }

  /**
   * 聚合主题
   */
  private aggregateThemes(contents: ContentInsightData[]): AggregatedTheme[] {
    const themeMap = new Map<string, AggregatedTheme>();

    for (const content of contents) {
      for (const topic of content.topics) {
        if (!themeMap.has(topic.name)) {
          themeMap.set(topic.name, {
            name: topic.name,
            contentIds: [],
            totalConfidence: 0,
            avgConfidence: 0,
            sentiments: [],
          });
        }

        const theme = themeMap.get(topic.name)!;
        if (!theme.contentIds.includes(content.contentId)) {
          theme.contentIds.push(content.contentId);
          theme.totalConfidence += topic.confidence;
          if (content.sentiments?.overall) {
            theme.sentiments.push(content.sentiments.overall);
          }
        }
      }
    }

    // 计算平均置信度
    for (const theme of themeMap.values()) {
      theme.avgConfidence = theme.totalConfidence / theme.contentIds.length;
    }

    // 按平均置信度和覆盖度排序
    return Array.from(themeMap.values()).sort(
      (a, b) => b.avgConfidence * b.contentIds.length - a.avgConfidence * a.contentIds.length,
    );
  }

  /**
   * 分析情感倾向
   */
  private analyzeSentiment(sentiments: string[]): ThemeAnalysis['sentiment'] {
    if (sentiments.length === 0) return 'neutral';

    const positive = sentiments.filter(s => s === 'positive').length;
    const negative = sentiments.filter(s => s === 'negative').length;
    const neutral = sentiments.filter(s => s === 'neutral').length;

    if (positive > negative && positive > neutral) return 'positive';
    if (negative > positive && negative > neutral) return 'negative';
    if (positive > 0 && negative > 0) return 'mixed';
    return 'neutral';
  }

  /**
   * 提取主题的证据
   */
  private extractEvidenceForTheme(
    contents: ContentInsightData[],
    themeName: string,
  ): string[] {
    const evidence: string[] = [];
    for (const content of contents) {
      const hasTheme = content.topics.some(t => t.name === themeName);
      if (hasTheme) {
        evidence.push(content.title);
        if (content.keyClaims.length > 0) {
          evidence.push(content.keyClaims[0]);
        }
      }
      if (evidence.length >= 5) break;
    }
    return evidence;
  }

  /**
   * 提取关键要点
   */
  private extractKeyPoints(
    contents: ContentInsightData[],
    themeName: string,
  ): string[] {
    const points: string[] = [];
    for (const content of contents) {
      const hasTheme = content.topics.some(t => t.name === themeName);
      if (hasTheme && content.keyClaims.length > 0) {
        points.push(...content.keyClaims.slice(0, 2));
      }
      if (points.length >= 5) break;
    }
    return points;
  }

  /**
   * 寻找内容中的矛盾
   */
  private findContradictions(
    contents: ContentInsightData[],
  ): { topic: string; evidence: string[] }[] {
    const contradictions: { topic: string; evidence: string[] }[] = [];

    const contentsWithStance = contents.filter(c => c.stance);
    const stances = [...new Set(contentsWithStance.map(c => c.stance!))];

    if (stances.length >= 2) {
      const evidence = contentsWithStance.map(c => `${c.title} (${c.stance})`);
      contradictions.push({
        topic: '整体立场',
        evidence,
      });
    }

    return contradictions;
  }

  /**
   * 合并选项
   */
  private mergeOptions(
    partialOptions: Partial<ReportGenerationOptions>,
  ): ReportGenerationOptions {
    return {
      executive: { ...DEFAULT_REPORT_OPTIONS.executive, ...partialOptions.executive },
      body: { ...DEFAULT_REPORT_OPTIONS.body, ...partialOptions.body },
      deepDive: { ...DEFAULT_REPORT_OPTIONS.deepDive, ...partialOptions.deepDive },
      personalization: { ...DEFAULT_REPORT_OPTIONS.personalization, ...partialOptions.personalization },
    };
  }

  /**
   * 生成报告标题
   */
  private generateTitle(themes: AggregatedTheme[]): string {
    if (themes.length === 0) return '洞察报告';
    const topTheme = themes[0];
    return `${topTheme.name}深度洞察报告`;
  }

  /**
   * 推断报告范围
   */
  private inferScope(themes: AggregatedTheme[]): string[] {
    return themes.slice(0, 5).map(t => t.name);
  }

  /**
   * 生成适配说明
   */
  private generateAdaptationNotes(
    profile?: CognitiveProfile,
    options?: ReportGenerationOptions,
  ): string[] {
    const notes: string[] = [];
    if (profile?.expertise && profile.expertise.length > 0) {
      notes.push(`根据${profile.expertise[0].level}水平用户调整`);
    }
    if (options?.personalization.adaptToProfile) {
      notes.push('已启用个性化适配');
    }
    return notes;
  }

  /**
   * 确定难度级别
   */
  private determineDifficultyLevel(
    profile?: CognitiveProfile,
    options?: ReportGenerationOptions,
  ): 'beginner' | 'intermediate' | 'advanced' {
    if (options?.personalization.difficultyLevel) {
      return options.personalization.difficultyLevel;
    }
    const level = profile?.expertise?.[0]?.level;
    if (level === 'expert') return 'advanced';
    if (level === 'novice') return 'beginner';
    return 'intermediate';
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 计算持续时间
   */
  private calculateDuration(start: Date, end: Date): string {
    const diff = end.getTime() - start.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 7) return `${days}天`;
    if (days < 30) return `${Math.ceil(days / 7)}周`;
    return `${Math.ceil(days / 30)}个月`;
  }

  /**
   * 获取主题颜色
   */
  private getThemeColor(index: number): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    return colors[index % colors.length];
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `ir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== 报告查询与管理 ====================

  /**
   * 获取报告预览
   */
  async getReportPreview(report: InsightReport): Promise<ReportPreview> {
    const estimatedReadTime = this.estimateReadTime(report);

    return {
      id: report.id,
      title: report.meta.title,
      scope: report.meta.scope,
      sourceCount: report.meta.sources,
      estimatedReadTime,
      keyThemeCount: report.body.themes.length,
      hasTimeline: !!report.body.timeline,
      hasComparison: !!report.body.comparison,
      hasDeepDive: report.deepDive.questions.length > 0,
      generatedAt: report.meta.generatedAt,
    };
  }

  /**
   * 估算阅读时间
   */
  private estimateReadTime(report: InsightReport): number {
    let totalChars = 0;
    
    // 执行摘要
    totalChars += report.executive.tlDr.length;
    report.executive.keyFindings.forEach(f => totalChars += f.statement.length);
    report.executive.recommendations.forEach(r => totalChars += r.action.length + r.rationale.length);
    
    // 主体内容
    report.body.themes.forEach(t => {
      totalChars += t.description.length;
      t.keyPoints.forEach(p => totalChars += p.length);
    });

    // 平均阅读速度：300字/分钟
    return Math.max(1, Math.ceil(totalChars / 300));
  }

  /**
   * 评估报告质量
   */
  async evaluateQuality(report: InsightReport): Promise<ReportQuality> {
    const scores = {
      insightfulness: this.calculateInsightfulness(report),
      comprehensiveness: this.calculateComprehensiveness(report),
      coherence: this.calculateCoherence(report),
      actionability: this.calculateActionability(report),
      originality: this.calculateOriginality(report),
    };

    return {
      reportId: report.id,
      scores,
      coverage: {
        themesAnalyzed: report.body.themes.length,
        sourcesUtilized: report.meta.sources,
        totalSources: report.meta.sources,
      },
      issues: this.identifyIssues(report, scores),
      improvements: this.suggestImprovements(report, scores),
    };
  }

  /**
   * 计算洞察深度得分
   */
  private calculateInsightfulness(report: InsightReport): number {
    const findingsCount = report.executive.keyFindings.length;
    const avgConfidence = report.executive.keyFindings.reduce(
      (sum, f) => sum + f.confidence, 0
    ) / Math.max(findingsCount, 1);
    return Math.min(1, (findingsCount / 5) * 0.5 + avgConfidence * 0.5);
  }

  /**
   * 计算全面性得分
   */
  private calculateComprehensiveness(report: InsightReport): number {
    const hasTimeline = report.body.timeline ? 0.2 : 0;
    const hasComparison = report.body.comparison ? 0.2 : 0;
    const hasNetwork = report.body.network.nodes.length > 0 ? 0.2 : 0;
    const hasDeepDive = report.deepDive.questions.length > 0 ? 0.2 : 0;
    const themeCoverage = Math.min(0.2, report.body.themes.length * 0.03);
    return Math.min(1, hasTimeline + hasComparison + hasNetwork + hasDeepDive + themeCoverage);
  }

  /**
   * 计算连贯性得分
   */
  private calculateCoherence(report: InsightReport): number {
    const connectedFindings = report.executive.keyFindings.filter(
      f => f.relatedThemes.length > 0
    ).length;
    return Math.min(1, connectedFindings / Math.max(report.executive.keyFindings.length, 1));
  }

  /**
   * 计算可行动性得分
   */
  private calculateActionability(report: InsightReport): number {
    const recommendations = report.executive.recommendations;
    if (recommendations.length === 0) return 0;
    const actionable = recommendations.filter(
      r => r.effort === 'low' || r.impact === 'high'
    ).length;
    return actionable / recommendations.length;
  }

  /**
   * 计算原创性得分
   */
  private calculateOriginality(report: InsightReport): number {
    const uniqueThemes = report.body.themes.filter(
      t => t.evidenceStrength > 0.7
    ).length;
    return Math.min(1, uniqueThemes / Math.max(report.body.themes.length, 1) * 0.5 + 0.5);
  }

  /**
   * 识别问题
   */
  private identifyIssues(report: InsightReport, scores: ReportQuality['scores']): string[] {
    const issues: string[] = [];
    if (scores.insightfulness < 0.5) issues.push('洞察深度不足');
    if (scores.comprehensiveness < 0.5) issues.push('内容覆盖不全面');
    if (scores.coherence < 0.5) issues.push('各部分关联性较弱');
    if (scores.actionability < 0.5) issues.push('可行动建议较少');
    return issues;
  }

  /**
   * 建议改进
   */
  private suggestImprovements(report: InsightReport, scores: ReportQuality['scores']): string[] {
    const improvements: string[] = [];
    if (scores.insightfulness < 0.5) improvements.push('增加更多高质量来源');
    if (scores.comprehensiveness < 0.5) improvements.push('补充时间线或对比分析');
    if (scores.coherence < 0.5) improvements.push('加强主题间的关联分析');
    if (scores.actionability < 0.5) improvements.push('提供更多具体可执行的建议');
    return improvements;
  }

  /**
   * 应用报告模板
   */
  applyTemplate(template: ReportTemplate): Partial<ReportGenerationOptions> {
    return TEMPLATE_CONFIGS[template] || {};
  }
}
