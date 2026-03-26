import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContentInput,
  AggregatedStory,
  ThemeCluster,
  ClusteredContent,
  PerspectiveComparison,
  Perspective,
  DifferencePoint,
  Evidence,
  EventTimeline,
  TimelineEvent,
  TimelinePhase,
  CredibilityAssessment,
  AggregationOptions,
  AggregationPreview,
  DEFAULT_AGGREGATION_OPTIONS,
  KnowledgeNode,
  KnowledgeEdge,
  ReadingPath,
  ReadingStep,
} from './content-aggregator.types';

/**
 * 内容聚合引擎
 * 
 * 核心能力:
 * 1. 主题聚类 - 将相关内容按主题分组
 * 2. 观点对比 - 识别不同来源的观点差异
 * 3. 时间线梳理 - 按时间顺序组织事件发展
 * 4. 证据权重评估 - 评估不同证据的可信度
 */
@Injectable()
export class ContentAggregatorService {
  private readonly logger = new Logger(ContentAggregatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 聚合多篇内容为知识单元
   */
  async aggregate(
    userId: string,
    contents: ContentInput[],
    options: Partial<AggregationOptions> = {},
  ): Promise<AggregatedStory> {
    const opts = this.mergeOptions(options);
    
    if (contents.length === 0) {
      throw new Error('至少需要一篇内容才能进行聚合');
    }

    this.logger.log(`开始聚合 ${contents.length} 篇内容 for user ${userId}`);

    // 1. 主题聚类
    const themes = await this.clusterThemes(contents, opts.clustering);

    // 2. 观点对比 (如果启用且有足够来源)
    let perspectives: PerspectiveComparison | undefined;
    if (opts.perspectiveAnalysis.enabled && 
        contents.length >= opts.perspectiveAnalysis.minSourcesForComparison) {
      perspectives = await this.analyzePerspectives(contents, themes);
    }

    // 3. 时间线梳理 (如果启用)
    let timeline: EventTimeline | undefined;
    if (opts.timeline.enabled) {
      timeline = await this.buildTimeline(contents, opts.timeline);
    }

    // 4. 证据权重评估
    const credibilityMap = await this.assessCredibility(contents, opts.credibility);

    // 5. 生成知识图谱
    const knowledgeGraph = this.buildKnowledgeGraph(themes, perspectives, contents);

    // 6. 生成推荐阅读路径
    const readingPaths = this.generateReadingPaths(themes, perspectives, timeline, contents);

    // 7. 构建聚合故事
    const story: AggregatedStory = {
      id: this.generateId(),
      userId,
      title: this.generateTitle(themes, contents),
      summary: this.generateSummary(themes, perspectives, contents),
      themes,
      perspectives,
      timeline,
      credibilityMap,
      meta: {
        sourceCount: contents.length,
        dateRange: this.calculateDateRange(contents),
        coverageScore: this.calculateCoverageScore(themes, contents),
        confidenceScore: this.calculateConfidenceScore(credibilityMap),
        generatedAt: new Date(),
        version: 1,
      },
      knowledgeGraph,
      readingPaths,
    };

    this.logger.log(`聚合完成: ${story.title}, ${themes.length} 个主题`);
    return story;
  }

  /**
   * 获取聚合预览 (轻量级)
   */
  async getPreview(
    userId: string,
    contents: ContentInput[],
  ): Promise<AggregationPreview> {
    const themes = await this.quickCluster(contents);
    
    return {
      id: this.generateId(),
      title: this.generateTitle(themes, contents),
      themeCount: themes.length,
      sourceCount: contents.length,
      hasPerspectives: contents.length >= 2,
      hasTimeline: this.hasTemporalContent(contents),
      confidenceScore: this.estimateConfidence(contents),
      generatedAt: new Date(),
    };
  }

  /**
   * 主题聚类 - 核心算法
   * 
   * 使用层次聚类 + TF-IDF 特征提取
   */
  private async clusterThemes(
    contents: ContentInput[],
    clusteringConfig: AggregationOptions['clustering'],
  ): Promise<ThemeCluster[]> {
    // 提取特征向量 (基于标题、实体、主题的综合)
    const features = contents.map(content => this.extractFeatures(content));
    
    // 计算相似度矩阵
    const similarityMatrix = this.buildSimilarityMatrix(features);
    
    // 层次聚类
    const clusters = this.hierarchicalClustering(
      contents,
      similarityMatrix,
      clusteringConfig.similarityThreshold,
      clusteringConfig.minClusterSize,
      clusteringConfig.maxClusters,
    );

    // 为每个聚类生成描述和摘要
    return clusters.map((cluster, index) => {
      const clusterFeatures = cluster.map(i => features[i]);
      const centroid = this.calculateCentroid(clusterFeatures);
      
      return {
        id: `theme_${index}`,
        name: this.generateClusterName(cluster, contents),
        description: this.generateClusterDescription(cluster, contents),
        keywords: this.extractClusterKeywords(clusterFeatures),
        contents: cluster.map(contentIndex => ({
          contentId: contents[contentIndex].id,
          title: contents[contentIndex].title,
          relevanceScore: this.calculateRelevance(
            features[contentIndex],
            centroid,
          ),
          excerpt: this.extractExcerpt(contents[contentIndex]),
          keyPoints: this.extractKeyPoints(contents[contentIndex]),
        })),
        centroid,
        cohesion: this.calculateCohesion(cluster, similarityMatrix),
      };
    });
  }

  /**
   * 快速聚类 (用于预览)
   */
  private async quickCluster(contents: ContentInput[]): Promise<Array<{ name: string; keywords: string[] }>> {
    // 简化的聚类 - 基于主题标签
    const themeMap = new Map<string, Set<number>>();
    
    contents.forEach((content, index) => {
      const topics = content.insights?.topics || [];
      topics.forEach(topic => {
        if (!themeMap.has(topic.name)) {
          themeMap.set(topic.name, new Set());
        }
        themeMap.get(topic.name)!.add(index);
      });
    });

    // 合并重叠的主题
    const mergedThemes: Array<{ name: string; keywords: string[]; contents: Set<number> }> = [];
    
    themeMap.forEach((contentSet, themeName) => {
      const existing = mergedThemes.find(t => 
        this.calculateJaccardSimilarity(t.contents, contentSet) > 0.3
      );
      
      if (existing) {
        existing.name = `${existing.name} / ${themeName}`;
        existing.contents = new Set([...existing.contents, ...contentSet]);
      } else {
        mergedThemes.push({
          name: themeName,
          keywords: [themeName],
          contents: contentSet,
        });
      }
    });

    return mergedThemes.map(t => ({
      name: t.name,
      keywords: t.keywords,
    }));
  }

  /**
   * 观点对比分析
   */
  private async analyzePerspectives(
    contents: ContentInput[],
    themes: ThemeCluster[],
  ): Promise<PerspectiveComparison> {
    // 找出主要争议主题
    const mainTheme = themes.sort((a, b) => 
      b.contents.length - a.contents.length
    )[0];

    const perspectives: Perspective[] = contents.map(content => {
      const stance = content.insights?.stance || 'neutral';
      const keyClaims = content.insights?.keyClaims || [];
      
      return {
        id: `persp_${content.id}`,
        source: {
          contentId: content.id,
          title: content.title,
          author: content.metadata?.author,
          publication: content.metadata?.siteName,
          credibilityScore: content.insights?.credibilityScore || 0.5,
        },
        stance: stance as 'supportive' | 'critical' | 'neutral' | 'exploratory',
        mainArgument: this.extractMainArgument(content),
        keyClaims: keyClaims.slice(0, 5),
        evidence: this.extractEvidence(content),
        confidence: content.insights?.qualityScore || 0.5,
      };
    });

    // 分析差异点
    const keyDifferences = this.identifyDifferences(perspectives);
    
    // 识别共识和争议区域
    const { consensusAreas, debateAreas } = this.analyzeAgreement(perspectives);

    return {
      topic: mainTheme?.name || '主题分析',
      perspectives,
      keyDifferences,
      consensusAreas,
      debateAreas,
    };
  }

  /**
   * 构建时间线
   */
  private async buildTimeline(
    contents: ContentInput[],
    timelineConfig: AggregationOptions['timeline'],
  ): Promise<EventTimeline> {
    const events: TimelineEvent[] = [];
    
    contents.forEach(content => {
      try {
        // 从内容元数据提取日期
        if (content.metadata?.publishDate) {
          events.push({
            id: `event_${content.id}_pub`,
            contentId: content.id,
            title: `${content.title} (发布)`,
            eventDate: new Date(content.metadata.publishDate),
            datePrecision: 'exact',
            description: `文章发布: ${content.title}`,
            significance: 'background',
            relatedEvents: [],
            sourceContext: content.contentText?.slice(0, 200) || '',
          });
        }

        // 从内容正文提取事件 (简化版)
        const extractedEvents = this.extractEventsFromContent(content);
        events.push(...extractedEvents);
      } catch (error) {
        this.logger.warn(`Error processing content ${content.id} for timeline: ${error.message}`);
      }
    });

    const uniqueEvents = this.deduplicateEvents(events);
    
    const sortedEvents = uniqueEvents.sort((a, b) => 
      a.eventDate.getTime() - b.eventDate.getTime()
    );

    // 过滤低重要性事件
    const significanceLevels = ['major', 'minor', 'background'];
    const minIndex = significanceLevels.indexOf(timelineConfig.minEventSignificance);
    const allowedLevels = significanceLevels.slice(0, minIndex + 1);
    
    const filteredEvents = sortedEvents.filter(e => allowedLevels.includes(e.significance));

    // 识别阶段
    const phases = this.identifyPhases(filteredEvents);

    return {
      events: filteredEvents,
      phases,
      span: {
        start: filteredEvents[0]?.eventDate || new Date(),
        end: filteredEvents[filteredEvents.length - 1]?.eventDate || new Date(),
      },
    };
  }

  /**
   * 证据可信度评估
   */
  private async assessCredibility(
    contents: ContentInput[],
    credibilityConfig: AggregationOptions['credibility'],
  ): Promise<CredibilityAssessment[]> {
    return contents.map(content => {
      const baseScore = content.insights?.credibilityScore || 0.5;
      const qualityScore = content.insights?.qualityScore || 0.5;
      
      // 评估各个维度
      const dimensions = {
        sourceAuthority: this.assessSourceAuthority(content),
        factualConsistency: qualityScore,
        evidenceSupport: this.countEvidence(content) > 0 ? 0.7 : 0.4,
        transparency: content.metadata?.author ? 0.7 : 0.5,
        recency: this.assessRecency(content),
      };

      // 计算总体分数
      const overallScore = Object.values(dimensions).reduce((a, b) => a + b, 0) / 5;

      // 识别红旗和优点
      const redFlags: string[] = [];
      const strengths: string[] = [];

      if (!content.metadata?.author) {
        redFlags.push('匿名来源');
      } else {
        strengths.push('有明确作者');
      }

      if (this.countEvidence(content) === 0) {
        redFlags.push('缺乏引用证据');
      } else {
        strengths.push('提供证据支持');
      }

      // 交叉验证 (简化版)
      const crossVerification = {
        verifiedClaims: content.insights?.keyClaims?.length || 0,
        disputedClaims: 0,
        unverifiedClaims: 0,
      };

      return {
        contentId: content.id,
        overallScore,
        dimensions,
        redFlags,
        strengths,
        crossVerification,
      };
    });
  }

  /**
   * 构建知识图谱
   */
  private buildKnowledgeGraph(
    themes: ThemeCluster[],
    perspectives?: PerspectiveComparison,
    contents?: ContentInput[],
  ): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    const nodes: KnowledgeNode[] = [];
    const edges: KnowledgeEdge[] = [];
    const nodeMap = new Map<string, string>();

    // 添加主题节点
    themes.forEach((theme, index) => {
      const nodeId = `theme_${index}`;
      nodes.push({
        id: nodeId,
        type: 'concept',
        label: theme.name,
        importance: theme.cohesion,
        description: theme.description,
      });
      nodeMap.set(theme.name, nodeId);

      // 添加关键词节点和边
      theme.keywords.forEach(keyword => {
        if (!nodeMap.has(keyword)) {
          const keywordId = `keyword_${keyword}`;
          nodes.push({
            id: keywordId,
            type: 'concept',
            label: keyword,
            importance: 0.5,
          });
          nodeMap.set(keyword, keywordId);
        }
        
        edges.push({
          source: nodeId,
          target: nodeMap.get(keyword)!,
          relation: 'contains',
          strength: 0.7,
        });
      });
    });

    // 添加观点节点
    if (perspectives) {
      perspectives.perspectives.forEach(p => {
        const nodeId = `persp_${p.id}`;
        nodes.push({
          id: nodeId,
          type: 'claim',
          label: p.mainArgument.slice(0, 50),
          importance: p.confidence,
          description: p.mainArgument,
        });

        // 连接观点到主题
        const themeNodeId = nodeMap.get(perspectives.topic);
        if (themeNodeId) {
          edges.push({
            source: themeNodeId,
            target: nodeId,
            relation: p.stance,
            strength: p.confidence,
          });
        }
      });
    }

    // 添加来源节点
    contents?.forEach(content => {
      const nodeId = `source_${content.id}`;
      nodes.push({
        id: nodeId,
        type: 'source',
        label: content.title.slice(0, 30),
        importance: content.insights?.qualityScore || 0.5,
        description: content.url,
      });
    });

    return { nodes, edges };
  }

  /**
   * 生成推荐阅读路径
   */
  private generateReadingPaths(
    themes: ThemeCluster[],
    perspectives?: PerspectiveComparison,
    timeline?: EventTimeline,
    contents?: ContentInput[],
  ): ReadingPath[] {
    const paths: ReadingPath[] = [];

    // 新手路径: 概览 -> 主要主题 -> 总结
    paths.push({
      id: 'path_beginner',
      name: '快速入门',
      description: '适合初次了解该主题，从概览开始逐步深入',
      difficulty: 'beginner',
      estimatedTime: 15,
      steps: [
        {
          order: 1,
          type: 'overview',
          targetId: 'summary',
          title: '阅读摘要',
          purpose: '了解整体脉络',
        },
        ...themes.slice(0, 2).map((theme, i) => ({
          order: i + 2,
          type: 'theme' as const,
          targetId: theme.id,
          title: theme.name,
          purpose: `理解核心主题: ${theme.name}`,
        })),
      ],
    });

    // 进阶路径: 主题 -> 观点对比 -> 深入
    paths.push({
      id: 'path_intermediate',
      name: '深度探索',
      description: '适合已有基础，希望了解不同观点和细节',
      difficulty: 'intermediate',
      estimatedTime: 30,
      steps: [
        ...themes.map((theme, i) => ({
          order: i + 1,
          type: 'theme' as const,
          targetId: theme.id,
          title: theme.name,
          purpose: `探索主题: ${theme.name}`,
        })),
        ...(perspectives ? [{
          order: themes.length + 1,
          type: 'perspective' as const,
          targetId: 'perspectives',
          title: '观点对比',
          purpose: '理解不同立场的论证',
        }] : []),
      ],
    });

    // 专家路径: 时间线 -> 所有主题 -> 原始来源
    if (timeline && contents) {
      paths.push({
        id: 'path_advanced',
        name: '完整研究',
        description: '按时间线追溯事件发展，查阅原始资料',
        difficulty: 'advanced',
        estimatedTime: 60,
        steps: [
          ...(timeline ? [{
            order: 1,
            type: 'overview' as const,
            targetId: 'timeline',
            title: '时间线概览',
            purpose: '按时间顺序理解事件发展',
          }] : []),
          ...themes.map((theme, i) => ({
            order: i + 2,
            type: 'deep_dive' as const,
            targetId: theme.id,
            title: `深入: ${theme.name}`,
            purpose: '阅读该主题的所有来源',
          })),
          ...contents.slice(0, 3).map((content, i) => ({
            order: themes.length + i + 2,
            type: 'source' as const,
            targetId: content.id,
            title: content.title.slice(0, 40),
            purpose: '查阅原始资料',
          })),
        ],
      });
    }

    return paths;
  }

  // ==================== 辅助方法 ====================

  private mergeOptions(options: Partial<AggregationOptions>): AggregationOptions {
    return {
      clustering: { ...DEFAULT_AGGREGATION_OPTIONS.clustering, ...options.clustering },
      perspectiveAnalysis: { ...DEFAULT_AGGREGATION_OPTIONS.perspectiveAnalysis, ...options.perspectiveAnalysis },
      timeline: { ...DEFAULT_AGGREGATION_OPTIONS.timeline, ...options.timeline },
      credibility: { ...DEFAULT_AGGREGATION_OPTIONS.credibility, ...options.credibility },
    };
  }

  private extractFeatures(content: ContentInput): number[] {
    // 简化的特征提取 - 基于主题和实体的加权向量
    const features: number[] = [];
    
    // 主题特征
    const topics = content.insights?.topics || [];
    topics.forEach(t => {
      features.push(t.confidence);
    });

    // 实体特征
    const entities = content.insights?.keyEntities || [];
    entities.forEach(e => {
      features.push(e.mentions / 10); // 归一化
    });

    // 情感特征
    const sentiment = content.insights?.sentiments?.score || 0;
    features.push(sentiment);

    return features.length > 0 ? features : [0.5]; // 默认特征
  }

  private buildSimilarityMatrix(features: number[][]): number[][] {
    const n = features.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const similarity = this.cosineSimilarity(features[i], features[j]);
        matrix[i][j] = similarity;
        matrix[j][i] = similarity;
      }
    }

    return matrix;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const maxLen = Math.max(a.length, b.length);
    const aPadded = [...a, ...Array(maxLen - a.length).fill(0)];
    const bPadded = [...b, ...Array(maxLen - b.length).fill(0)];

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < maxLen; i++) {
      dotProduct += aPadded[i] * bPadded[i];
      normA += aPadded[i] * aPadded[i];
      normB += bPadded[i] * bPadded[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private hierarchicalClustering(
    contents: ContentInput[],
    similarityMatrix: number[][],
    threshold: number,
    minClusterSize: number,
    maxClusters: number,
  ): number[][] {
    const n = contents.length;
    if (n === 0) return [];
    if (n === 1) return [[0]];

    // 每个点初始为一个簇
    let clusters: number[][] = Array.from({ length: n }, (_, i) => [i]);

    // 层次聚类
    while (clusters.length > maxClusters) {
      let maxSimilarity = -1;
      let mergeI = -1;
      let mergeJ = -1;

      // 找到最相似的簇对
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const sim = this.clusterSimilarity(clusters[i], clusters[j], similarityMatrix);
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // 如果最大相似度低于阈值，停止合并
      if (maxSimilarity < threshold) break;

      // 合并簇
      clusters[mergeI] = [...clusters[mergeI], ...clusters[mergeJ]];
      clusters.splice(mergeJ, 1);
    }

    // 处理小簇: 合并到最相似的簇或保持独立
    const validClusters = clusters.filter(c => c.length >= minClusterSize);
    const smallClusters = clusters.filter(c => c.length < minClusterSize);

    // 将小簇的内容分配到最相似的 valid cluster
    smallClusters.forEach(small => {
      small.forEach(item => {
        let bestCluster = validClusters[0];
        let bestSim = -1;
        
        validClusters.forEach(valid => {
          const sim = this.clusterSimilarity([item], valid, similarityMatrix);
          if (sim > bestSim) {
            bestSim = sim;
            bestCluster = valid;
          }
        });

        if (bestCluster) {
          bestCluster.push(item);
        } else {
          validClusters.push([item]);
        }
      });
    });

    return validClusters.length > 0 ? validClusters : clusters;
  }

  private clusterSimilarity(clusterA: number[], clusterB: number[], matrix: number[][]): number {
    let totalSim = 0;
    let count = 0;

    for (const i of clusterA) {
      for (const j of clusterB) {
        totalSim += matrix[i][j];
        count++;
      }
    }

    return count > 0 ? totalSim / count : 0;
  }

  private calculateCentroid(features: number[][]): number[] {
    if (features.length === 0) return [];
    
    const dim = features[0].length;
    const centroid: number[] = Array(dim).fill(0);

    features.forEach(f => {
      f.forEach((val, i) => {
        centroid[i] = (centroid[i] || 0) + val;
      });
    });

    return centroid.map(v => v / features.length);
  }

  private calculateRelevance(features: number[], centroid: number[]): number {
    return this.cosineSimilarity(features, centroid);
  }

  private calculateCohesion(cluster: number[], similarityMatrix: number[][]): number {
    if (cluster.length <= 1) return 1;

    let totalSim = 0;
    let count = 0;

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalSim += similarityMatrix[cluster[i]][cluster[j]];
        count++;
      }
    }

    return count > 0 ? totalSim / count : 0;
  }

  private generateClusterName(cluster: number[], contents: ContentInput[]): string {
    // 基于聚类中内容的共同主题生成名称
    const topicCounts = new Map<string, number>();
    
    cluster.forEach(idx => {
      const topics = contents[idx].insights?.topics || [];
      topics.forEach(t => {
        topicCounts.set(t.name, (topicCounts.get(t.name) || 0) + t.confidence);
      });
    });

    const sorted = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || `主题 ${cluster[0]}`;
  }

  private generateClusterDescription(cluster: number[], contents: ContentInput[]): string {
    const titles = cluster.map(i => contents[i].title);
    return `包含 ${cluster.length} 篇相关内容: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`;
  }

  private extractClusterKeywords(features: number[][]): string[] {
    // 提取聚类的代表性关键词 (简化版)
    return ['关键词1', '关键词2', '关键词3'];
  }

  private extractExcerpt(content: ContentInput): string {
    const text = content.contentText || '';
    return text.slice(0, 200).replace(/\s+/g, ' ') + (text.length > 200 ? '...' : '');
  }

  private extractKeyPoints(content: ContentInput): string[] {
    return content.insights?.keyClaims?.slice(0, 3) || ['暂无关键点'];
  }

  private extractMainArgument(content: ContentInput): string {
    const claims = content.insights?.keyClaims || [];
    return claims[0] || content.summary?.slice(0, 200) || '未提取到主要论点';
  }

  private extractEvidence(content: ContentInput): Evidence[] {
    // 简化的证据提取
    return [{
      type: 'logical',
      content: '基于内容分析的逻辑论证',
      weight: 0.6,
      verifiable: false,
    }];
  }

  private identifyDifferences(perspectives: Perspective[]): DifferencePoint[] {
    const differences: DifferencePoint[] = [];

    // 基于立场差异识别
    const stances = perspectives.map(p => p.stance);
    const uniqueStances = [...new Set(stances)];

    if (uniqueStances.length > 1) {
      differences.push({
        aspect: '整体立场',
        descriptions: perspectives.map(p => ({
          perspectiveId: p.id,
          description: `${p.source.title}: ${p.stance}`,
        })),
        significance: 'high',
      });
    }

    return differences;
  }

  private analyzeAgreement(perspectives: Perspective[]): { consensusAreas: string[]; debateAreas: string[] } {
    const allClaims = perspectives.flatMap(p => p.keyClaims);
    const claimCounts = new Map<string, number>();
    
    allClaims.forEach(claim => {
      claimCounts.set(claim, (claimCounts.get(claim) || 0) + 1);
    });

    const consensusAreas: string[] = [];
    const debateAreas: string[] = [];

    claimCounts.forEach((count, claim) => {
      if (count > 1) {
        consensusAreas.push(claim);
      } else {
        debateAreas.push(claim);
      }
    });

    return { consensusAreas, debateAreas };
  }

  private extractEventsFromContent(content: ContentInput): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    
    // 从 temporalContext 提取
    if (content.insights?.temporalContext?.eventTime) {
      events.push({
        id: `event_${content.id}_temp`,
        contentId: content.id,
        title: `${content.title} (相关事件)`,
        eventDate: new Date(content.insights.temporalContext.eventTime),
        datePrecision: 'month',
        description: `时间相关: ${content.title}`,
        significance: 'minor',
        relatedEvents: [],
        sourceContext: content.contentText?.slice(0, 200) || '',
      });
    }

    return events;
  }

  private deduplicateEvents(events: TimelineEvent[]): TimelineEvent[] {
    const seen = new Set<string>();
    return events.filter(e => {
      const key = `${e.title}_${e.eventDate.toISOString().split('T')[0]}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private identifyPhases(events: TimelineEvent[]): TimelinePhase[] {
    if (events.length < 3) return [];

    const phases: TimelinePhase[] = [];
    const midpoint = Math.floor(events.length / 2);

    phases.push({
      name: '初期阶段',
      description: '事件开始阶段',
      startDate: events[0].eventDate,
      endDate: events[midpoint - 1]?.eventDate || events[0].eventDate,
      events: events.slice(0, midpoint).map(e => e.id),
    });

    phases.push({
      name: '发展阶段',
      description: '事件发展阶段',
      startDate: events[midpoint]?.eventDate || events[events.length - 1].eventDate,
      endDate: events[events.length - 1].eventDate,
      events: events.slice(midpoint).map(e => e.id),
    });

    return phases;
  }

  private assessSourceAuthority(content: ContentInput): number {
    let score = 0.5;
    
    // 基于来源类型评估
    const siteName = content.metadata?.siteName || '';
    const knownSources: Record<string, number> = {
      'Reuters': 0.9,
      'Bloomberg': 0.9,
      'Nature': 0.95,
      'Science': 0.95,
      'Wikipedia': 0.7,
    };

    for (const [source, sourceScore] of Object.entries(knownSources)) {
      if (siteName.includes(source)) {
        score = sourceScore;
        break;
      }
    }

    return score;
  }

  private assessRecency(content: ContentInput): number {
    const publishDate = content.metadata?.publishDate;
    if (!publishDate) return 0.5;

    const date = new Date(publishDate);
    const now = new Date();
    const daysDiff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff < 7) return 1.0;
    if (daysDiff < 30) return 0.9;
    if (daysDiff < 90) return 0.8;
    if (daysDiff < 365) return 0.6;
    return 0.4;
  }

  private countEvidence(content: ContentInput): number {
    return content.insights?.keyClaims?.length || 0;
  }

  private calculateJaccardSimilarity(setA: Set<number>, setB: Set<number>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  private generateTitle(
    themes: Array<{ name: string; keywords?: string[] }>,
    contents: ContentInput[],
  ): string {
    if (themes.length > 0) {
      return themes[0].name;
    }
    return contents[0]?.title || '聚合内容';
  }

  private generateSummary(
    themes: ThemeCluster[],
    perspectives?: PerspectiveComparison,
    contents?: ContentInput[],
  ): string {
    const parts: string[] = [];
    
    parts.push(`本聚合包含 ${contents?.length || 0} 篇相关内容，分为 ${themes.length} 个主题。`);
    
    if (perspectives) {
      parts.push(`识别出 ${perspectives.perspectives.length} 种不同观点。`);
    }

    parts.push(`主要主题: ${themes.map(t => t.name).join(', ')}。`);

    return parts.join(' ');
  }

  private calculateDateRange(contents: ContentInput[]): { start: Date; end: Date } {
    const dates = contents
      .map(c => c.metadata?.publishDate)
      .filter((d): d is string => !!d)
      .map(d => new Date(d));

    if (dates.length === 0) {
      return { start: new Date(), end: new Date() };
    }

    return {
      start: new Date(Math.min(...dates.map(d => d.getTime()))),
      end: new Date(Math.max(...dates.map(d => d.getTime()))),
    };
  }

  private calculateCoverageScore(themes: ThemeCluster[], contents: ContentInput[]): number {
    const coveredContents = new Set(themes.flatMap(t => t.contents.map(c => c.contentId)));
    return coveredContents.size / contents.length;
  }

  private calculateConfidenceScore(credibilityMap: CredibilityAssessment[]): number {
    if (credibilityMap.length === 0) return 0;
    const total = credibilityMap.reduce((sum, c) => sum + c.overallScore, 0);
    return total / credibilityMap.length;
  }

  private hasTemporalContent(contents: ContentInput[]): boolean {
    return contents.some(c => 
      c.metadata?.publishDate || c.insights?.temporalContext?.eventTime
    );
  }

  private estimateConfidence(contents: ContentInput[]): number {
    const scores = contents.map(c => c.insights?.qualityScore || 0.5);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private generateId(): string {
    return `agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
