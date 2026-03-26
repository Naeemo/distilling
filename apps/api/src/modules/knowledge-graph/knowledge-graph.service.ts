import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, RelationType } from '@prisma/client';
import { ContentPositionDto } from './dto';

@Injectable()
export class KnowledgeGraphService {
  constructor(private prisma: PrismaService) {}

  // ==================== 内容洞察分析 ====================
  
  async analyzeContent(userId: string, contentId: string, analysisData: {
    topics?: { name: string; confidence: number }[];
    keyEntities?: { name: string; type: string; mentions: number }[];
    sentiments?: { overall: string; score: number };
    stance?: string;
    keyClaims?: string[];
    qualityScore?: number;
    credibilityScore?: number;
    embedding?: number[];
  }) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, userId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const insight = await this.prisma.contentInsight.upsert({
      where: { contentId },
      update: {
        topics: analysisData.topics as Prisma.JsonValue,
        keyEntities: analysisData.keyEntities as Prisma.JsonValue,
        sentiments: analysisData.sentiments as Prisma.JsonValue,
        stance: analysisData.stance,
        keyClaims: analysisData.keyClaims as Prisma.JsonValue,
        qualityScore: analysisData.qualityScore,
        credibilityScore: analysisData.credibilityScore,
      },
      create: {
        contentId,
        userId,
        topics: analysisData.topics as Prisma.JsonValue,
        keyEntities: analysisData.keyEntities as Prisma.JsonValue,
        sentiments: analysisData.sentiments as Prisma.JsonValue,
        stance: analysisData.stance,
        keyClaims: analysisData.keyClaims as Prisma.JsonValue,
        qualityScore: analysisData.qualityScore,
        credibilityScore: analysisData.credibilityScore,
      },
    });

    return insight;
  }

  async getContentInsight(userId: string, contentId: string) {
    const insight = await this.prisma.contentInsight.findFirst({
      where: { contentId, userId },
      include: {
        content: {
          select: {
            title: true,
            url: true,
            createdAt: true,
          },
        },
      },
    });

    if (!insight) {
      throw new NotFoundException('Content insight not found');
    }

    return insight;
  }

  // ==================== 内容关联管理 ====================

  async createRelation(userId: string, data: {
    contentAId: string;
    contentBId: string;
    relationType: RelationType;
    strength: number;
    description?: string;
    evidence?: string[];
    isDirectional?: boolean;
    directionFrom?: string;
  }) {
    // 确保两篇文章都属于该用户
    const [contentA, contentB] = await Promise.all([
      this.prisma.content.findFirst({ where: { id: data.contentAId, userId } }),
      this.prisma.content.findFirst({ where: { id: data.contentBId, userId } }),
    ]);

    if (!contentA || !contentB) {
      throw new NotFoundException('One or both content not found');
    }

    // 确保顺序一致（避免重复创建 A-B 和 B-A）
    const [idA, idB] = [data.contentAId, data.contentBId].sort();
    const isReordered = idA !== data.contentAId;

    const relation = await this.prisma.contentRelation.upsert({
      where: {
        contentAId_contentBId_relationType: {
          contentAId: idA,
          contentBId: idB,
          relationType: data.relationType,
        },
      },
      update: {
        strength: data.strength,
        description: data.description,
        evidence: data.evidence as Prisma.JsonValue,
      },
      create: {
        contentAId: idA,
        contentBId: idB,
        userId,
        relationType: data.relationType,
        strength: data.strength,
        description: data.description,
        evidence: data.evidence as Prisma.JsonValue,
        isDirectional: data.isDirectional ?? false,
        directionFrom: data.directionFrom,
      },
    });

    return relation;
  }

  async getContentRelations(userId: string, contentId: string, filters?: {
    relationType?: RelationType;
    minStrength?: number;
  }) {
    const where: Prisma.ContentRelationWhereInput = {
      userId,
      OR: [
        { contentAId: contentId },
        { contentBId: contentId },
      ],
    };

    if (filters?.relationType) {
      where.relationType = filters.relationType;
    }

    if (filters?.minStrength !== undefined) {
      where.strength = { gte: filters.minStrength };
    }

    const relations = await this.prisma.contentRelation.findMany({
      where,
      include: {
        contentA: {
          select: { id: true, title: true, url: true, status: true },
        },
        contentB: {
          select: { id: true, title: true, url: true, status: true },
        },
      },
      orderBy: { strength: 'desc' },
    });

    // 格式化返回，统一结构
    return relations.map((rel) => {
      const isA = rel.contentAId === contentId;
      const relatedContent = isA ? rel.contentB : rel.contentA;
      
      return {
        relationId: rel.id,
        relationType: rel.relationType,
        strength: rel.strength,
        description: rel.description,
        evidence: rel.evidence,
        isDirectional: rel.isDirectional,
        direction: rel.isDirectional 
          ? (rel.directionFrom === contentId ? 'outgoing' : 'incoming')
          : 'bidirectional',
        relatedContent,
        createdAt: rel.createdAt,
      };
    });
  }

  // ==================== 知识图谱查询 ====================

  async getKnowledgeGraph(userId: string, options?: {
    centerContentId?: string;
    maxNodes?: number;
    topic?: string;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const maxNodes = options?.maxNodes ?? 50;

    // 获取内容节点
    let contentWhere: Prisma.ContentWhereInput = { userId };
    
    if (options?.topic) {
      contentWhere = {
        ...contentWhere,
        insights: {
          topics: {
            path: ['name'],
            array_contains: options.topic,
          },
        },
      };
    }

    if (options?.fromDate || options?.toDate) {
      contentWhere.createdAt = {};
      if (options.fromDate) contentWhere.createdAt.gte = options.fromDate;
      if (options.toDate) contentWhere.createdAt.lte = options.toDate;
    }

    // 如果指定了中心节点，获取其关联的节点
    let contentIds: string[] = [];
    if (options?.centerContentId) {
      const related = await this.prisma.contentRelation.findMany({
        where: {
          userId,
          OR: [
            { contentAId: options.centerContentId },
            { contentBId: options.centerContentId },
          ],
        },
        take: maxNodes,
      });
      
      contentIds = [options.centerContentId];
      related.forEach((rel) => {
        contentIds.push(rel.contentAId === options.centerContentId ? rel.contentBId : rel.contentAId);
      });
      contentIds = [...new Set(contentIds)];
      
      contentWhere.id = { in: contentIds };
    }

    const contents = await this.prisma.content.findMany({
      where: contentWhere,
      take: maxNodes,
      include: {
        insights: true,
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 获取这些节点之间的关联
    const nodeIds = contents.map((c) => c.id);
    const relations = await this.prisma.contentRelation.findMany({
      where: {
        userId,
        contentAId: { in: nodeIds },
        contentBId: { in: nodeIds },
      },
    });

    // 格式化图谱数据
    return {
      nodes: contents.map((content) => ({
        id: content.id,
        title: content.title,
        url: content.url,
        status: content.status,
        createdAt: content.createdAt,
        topics: content.insights?.topics || [],
        entities: content.insights?.keyEntities || [],
        qualityScore: content.insights?.qualityScore,
        stance: content.insights?.stance,
        tags: content.tags.map((t) => t.tag.name),
        // 用于力导向图的初始位置
        x: Math.random() * 800,
        y: Math.random() * 600,
        // 节点大小基于质量分数
        size: (content.insights?.qualityScore || 0.5) * 20 + 10,
      })),
      edges: relations.map((rel) => ({
        id: rel.id,
        source: rel.contentAId,
        target: rel.contentBId,
        type: rel.relationType,
        strength: rel.strength,
        isDirectional: rel.isDirectional,
        // 边的粗细基于关联强度
        width: rel.strength * 5 + 1,
      })),
    };
  }

  // ==================== "信息世界位置" 核心功能 ====================

  async getContentPosition(userId: string, contentId: string): Promise<ContentPositionDto> {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, userId },
      include: {
        insights: true,
        relationsA: true,
        relationsB: true,
        tags: { include: { tag: true } },
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const insight = content.insights;
    const allRelations = [...content.relationsA, ...content.relationsB];

    // 统计关联类型
    const relationCounts = allRelations.reduce((acc, rel) => {
      acc[rel.relationType] = (acc[rel.relationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 获取主题聚类（简化版本，避免复杂JSON查询）
    const topics = (insight?.topics as any[]) || [];
    const topicClusters = topics.slice(0, 5).map((topic) => ({
      name: topic.name,
      relevance: topic.confidence,
      articleCount: 0, // 简化处理
    }));

    // 判断文章角色
    const role = this.determineContentRole(content, allRelations, insight);

    // 构建位置描述
    return {
      position: {
        domain: this.inferDomain(topics, content.tags),
        level: this.inferDepthLevel(insight?.qualityScore, content.contentText?.length),
        audience: this.inferAudience(insight?.qualityScore, (insight?.keyEntities as any[])?.length),
        informationDensity: this.calculateInfoDensity(content, insight),
      },
      networkStats: {
        relatedCount: allRelations.length,
        similarTopics: relationCounts[RelationType.SIMILAR_TOPIC] || 0,
        contradictoryCount: relationCounts[RelationType.CONTRADICTORY] || 0,
        supportiveCount: relationCounts[RelationType.SUPPORTIVE] || 0,
        entityConnections: relationCounts[RelationType.SHARED_ENTITY] || 0,
      },
      topicClusters,
      role,
    };
  }

  private determineContentRole(
    content: any,
    relations: any[],
    insight: any
  ): { type: string; importance: number; uniqueness: number } {
    // 分析文章在信息网络中的角色
    
    const hasManyReferences = relations.filter(r => 
      r.relationType === RelationType.REFERENCED
    ).length > 2;
    
    const isReferencedByOthers = relations.filter(r => 
      r.relationType === RelationType.REFERENCED && 
      r.contentBId === content.id
    ).length > 0;

    const keyClaims = (insight?.keyClaims as any[]) || [];
    const hasSynthesisIndicators = keyClaims.length > 3;
    const isBreakingNews = content.sourceType === 'NEWSLETTER' || 
      (content.metadata as any)?.referenceType === 'breaking';

    let type = 'commentary';
    if (isBreakingNews) type = 'breaking';
    else if (hasManyReferences && hasSynthesisIndicators) type = 'synthesis';
    else if (isReferencedByOthers) type = 'source';

    // 重要性评分
    const importance = Math.min(1, 
      (relations.length / 10) * 0.4 + 
      (insight?.qualityScore || 0) * 0.4 +
      ((insight?.keyEntities?.length || 0) / 10) * 0.2
    );

    // 独特性评分（基于与其他文章的差异度）
    const relationCounts = relations.reduce((acc, r) => {
      acc[r.relationType] = (acc[r.relationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const uniqueness = Math.min(1,
      (1 - (relationCounts[RelationType.SIMILAR_TOPIC] || 0) / Math.max(relations.length, 1)) * 0.6 +
      (insight?.stance === 'critical' ? 0.3 : 0.1)
    );

    return { type, importance, uniqueness };
  }

  private inferDomain(topics: any[], tags: any[]): string {
    const topicNames = topics.map((t) => t.name?.toLowerCase() || '');
    const tagNames = tags.map((t) => t.tag.name.toLowerCase());
    const allKeywords = [...topicNames, ...tagNames];

    const domains = {
      tech: ['ai', 'artificial intelligence', 'software', 'programming', 'tech', 'technology', 'startup'],
      politics: ['politics', 'government', 'policy', 'election', 'democracy', 'political'],
      science: ['science', 'research', 'study', 'physics', 'biology', 'chemistry', 'academic'],
      business: ['business', 'finance', 'economy', 'market', 'investment', 'money'],
      culture: ['culture', 'art', 'music', 'literature', 'society', 'social'],
    };

    for (const [domain, keywords] of Object.entries(domains)) {
      if (allKeywords.some((k) => keywords.some((kw) => k.includes(kw)))) {
        return domain;
      }
    }

    return 'general';
  }

  private inferDepthLevel(qualityScore?: number, contentLength?: number): string {
    if (!qualityScore && !contentLength) return 'surface';
    
    const lengthScore = contentLength ? Math.min(contentLength / 5000, 1) : 0;
    const combinedScore = (qualityScore || 0) * 0.6 + lengthScore * 0.4;

    if (combinedScore > 0.7) return 'deep';
    if (combinedScore > 0.4) return 'intermediate';
    return 'surface';
  }

  private inferAudience(qualityScore?: number, entityCount?: number): string {
    const score = (qualityScore || 0) * 0.5 + Math.min((entityCount || 0) / 10, 1) * 0.5;
    
    if (score > 0.7) return 'academic';
    if (score > 0.4) return 'professional';
    return 'general';
  }

  private calculateInfoDensity(content: any, insight: any): number {
    const textLength = content.contentText?.length || 0;
    const entityCount = insight?.keyEntities?.length || 0;
    const claimCount = insight?.keyClaims?.length || 0;

    if (textLength === 0) return 0;

    // 每千字中的实体和主张数量
    const entitiesPerK = (entityCount / textLength) * 1000;
    const claimsPerK = (claimCount / textLength) * 1000;

    return Math.min(1, (entitiesPerK + claimsPerK) / 10);
  }

  // ==================== 自动关联发现 ====================

  async discoverRelations(userId: string, contentId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, userId },
      include: { insights: true, tags: { include: { tag: true } } },
    });

    if (!content || !content.insights) {
      return { suggestions: [] };
    }

    const discovered: any[] = [];
    const contentTopics = (content.insights.topics as any[]) || [];
    const contentEntities = (content.insights.keyEntities as any[]) || [];

    // 简化版本：基于标签匹配发现关联
    const tagNames = content.tags.map(t => t.tag.name);
    
    const similarContents = await this.prisma.content.findMany({
      where: {
        userId,
        id: { not: contentId },
        tags: {
          some: {
            tag: {
              name: { in: tagNames },
            },
          },
        },
      },
      include: { insights: true, tags: { include: { tag: true } } },
      take: 10,
    });

    for (const similar of similarContents) {
      const similarTags = similar.tags.map(t => t.tag.name);
      const commonTags = tagNames.filter(t => similarTags.includes(t));
      const strength = commonTags.length / Math.max(tagNames.length, similarTags.length);

      if (strength > 0.2) {
        discovered.push({
          contentAId: contentId,
          contentBId: similar.id,
          relationType: RelationType.SIMILAR_TOPIC,
          strength,
          description: `共享标签: ${commonTags.join(', ')}`,
          evidence: commonTags.map(t => `共同标签: ${t}`),
        });
      }
    }

    // 去重并按强度排序
    const unique = new Map<string, any>();
    for (const d of discovered) {
      const key = [d.contentAId, d.contentBId].sort().join('-');
      if (!unique.has(key) || unique.get(key).strength < d.strength) {
        unique.set(key, d);
      }
    }

    return {
      suggestions: Array.from(unique.values())
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 10),
    };
  }
}
