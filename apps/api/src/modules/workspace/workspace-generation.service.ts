import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UserProfileService } from '../output/user-profile.service';
import { BehaviorEventType } from '../output/user-profile.types';

type ContentCandidate = {
  id: string;
  title: string;
  contentText: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  insights: {
    topics?: Array<{ name?: string; confidence?: number }>;
    keyClaims?: string[];
    keyEntities?: Array<{ name?: string; type?: string; mentions?: number }>;
  } | null;
  tags: Array<{ tag: { name: string } }>;
};

type RankedReference = {
  contentId: string;
  title: string;
  summary: string | null;
  score: number;
  reason: string;
  matchedBy: string;
};

@Injectable()
export class WorkspaceGenerationService {
  private readonly logger = new Logger(WorkspaceGenerationService.name);
  private readonly maxReferenceCount = 6;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly userProfileService: UserProfileService,
  ) {}

  async generateArticle(workspaceItemId: string): Promise<void> {
    const workspaceItem = await this.prisma.workspaceItem.findUnique({
      where: { id: workspaceItemId },
    });

    if (!workspaceItem) {
      return;
    }

    try {
      const references = await this.findReferences(workspaceItem.userId, workspaceItem.initialIdea);
      const generated = await this.composeArticle(workspaceItem.initialIdea, references);

      await this.prisma.$transaction(async (tx) => {
        await tx.workspaceReference.deleteMany({
          where: { workspaceItemId },
        });

        if (references.length > 0) {
          await tx.workspaceReference.createMany({
            data: references.map((reference, index) => ({
              workspaceItemId,
              contentId: reference.contentId,
              rank: index + 1,
              score: reference.score,
              reason: reference.reason,
            })),
          });
        }

        await tx.workspaceItem.update({
          where: { id: workspaceItemId },
          data: {
            title: generated.title,
            body: generated.body,
            excerpt: this.buildExcerpt(generated.body),
            generationError: null,
            status: WorkspaceItemStatus.READY,
            lastGeneratedAt: new Date(),
          },
        });
      });

      await this.recordProfileSignal(workspaceItem.userId, workspaceItem.initialIdea, references);
    } catch (error) {
      this.logger.warn(
        `Workspace article generation failed for ${workspaceItemId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      await this.prisma.workspaceItem.update({
        where: { id: workspaceItemId },
        data: {
          status: WorkspaceItemStatus.FAILED,
          generationError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  private async findReferences(userId: string, initialIdea: string): Promise<RankedReference[]> {
    const candidates = await this.prisma.content.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        contentText: true,
        summary: true,
        metadata: true,
        insights: {
          select: {
            topics: true,
            keyClaims: true,
            keyEntities: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const keywords = this.extractKeywords(initialIdea);
    const ranked = candidates
      .map((candidate) => this.scoreCandidate(candidate as ContentCandidate, initialIdea, keywords))
      .filter((candidate): candidate is RankedReference => candidate !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxReferenceCount);

    if (ranked.length > 0) {
      return ranked;
    }

    return candidates.slice(0, 3).map((candidate, index) => ({
      contentId: candidate.id,
      title: candidate.title,
      summary: candidate.summary,
      score: Math.max(0.12 - index * 0.02, 0.05),
      reason: '当前没有明显强匹配的参考，补充最近保存的资料作为背景上下文。',
      matchedBy: 'recent_context',
    }));
  }

  private scoreCandidate(
    candidate: ContentCandidate,
    initialIdea: string,
    keywords: string[],
  ): RankedReference | null {
    const idea = this.normalize(initialIdea);
    const title = this.normalize(candidate.title);
    const body = this.normalize(candidate.contentText || '');
    const summary = this.normalize(candidate.summary || '');
    const topics = this.readStringArray(candidate.insights?.topics, 'name');
    const entities = this.readStringArray(candidate.insights?.keyEntities, 'name');
    const claims = Array.isArray(candidate.insights?.keyClaims) ? candidate.insights?.keyClaims : [];
    const tags = candidate.tags.map((tag) => tag.tag.name);

    let score = 0;
    const reasons: string[] = [];
    const addReason = (reason: string) => {
      if (!reasons.includes(reason)) {
        reasons.push(reason);
      }
    };

    if (title.includes(idea) && idea.length >= 4) {
      score += 5;
      addReason('标题与初始想法高度接近');
    }

    if (summary.includes(idea) && idea.length >= 4) {
      score += 3;
      addReason('摘要与初始想法高度接近');
    }

    if (body.includes(idea) && idea.length >= 4) {
      score += 2.5;
      addReason('正文与初始想法高度接近');
    }

    for (const keyword of keywords) {
      if (title.includes(keyword)) {
        score += 1.5;
        addReason(`标题命中关键词「${keyword}」`);
      }
      if (summary.includes(keyword)) {
        score += 1.2;
        addReason(`摘要命中关键词「${keyword}」`);
      }
      if (body.includes(keyword)) {
        score += 0.6;
        addReason(`正文命中关键词「${keyword}」`);
      }
      if (topics.some((topic) => this.normalize(topic).includes(keyword))) {
        score += 1.8;
        addReason(`主题分析命中关键词「${keyword}」`);
      }
      if (entities.some((entity) => this.normalize(entity).includes(keyword))) {
        score += 1.2;
        addReason(`实体分析命中关键词「${keyword}」`);
      }
      if (claims.some((claim) => this.normalize(claim).includes(keyword))) {
        score += 1.3;
        addReason(`关键观点命中关键词「${keyword}」`);
      }
      if (tags.some((tag) => this.normalize(tag).includes(keyword))) {
        score += 1;
        addReason(`标签命中关键词「${keyword}」`);
      }
    }

    if (score <= 0) {
      return null;
    }

    return {
      contentId: candidate.id,
      title: candidate.title,
      summary: candidate.summary,
      score: Number(score.toFixed(2)),
      reason: reasons[0] || '与当前写作主题相关',
      matchedBy: reasons[0] || 'mixed',
    };
  }

  private async composeArticle(
    initialIdea: string,
    references: RankedReference[],
  ): Promise<{ title: string; body: string }> {
    const prompt = this.buildGenerationPrompt(initialIdea, references);
    const result = await this.aiService.generateText(prompt, {
      maxTokens: 1600,
      temperature: 0.55,
      systemPrompt:
        '你是一位帮助用户梳理想法的中文写作助手。你必须基于用户初始想法和参考资料，输出结构清晰、表达自然、可继续编辑的文章草稿。',
    });

    return this.parseGeneratedArticle(result.text, initialIdea, references);
  }

  private buildGenerationPrompt(initialIdea: string, references: RankedReference[]): string {
    const referenceText = references.length === 0
      ? '没有明显强匹配的参考，请基于用户想法生成一版结构化草稿，并在适当位置指出仍需补证据。'
      : references
        .map((reference, index) => {
          const summary = reference.summary?.trim() || '暂无摘要，可作为背景线索。';
          return [
            `参考 ${index + 1}`,
            `标题：${reference.title}`,
            `相关度：${reference.score}`,
            `命中原因：${reference.reason}`,
            `摘要：${summary}`,
          ].join('\n');
        })
        .join('\n\n');

    return [
      '请根据下面的用户初始想法和个人资料库参考，生成一篇中文文章草稿。',
      '要求：',
      '1. 文章应体现用户正在主动思考，而不是纯摘要拼接。',
      '2. 标题要具体，不要使用“浅谈”“一些思考”这类空泛表达。',
      '3. 正文使用 Markdown，包含导语、2-4 个小节和一个收束段。',
      '4. 如果参考不足，要在正文中自然点出哪些判断仍需继续观察，而不是杜撰事实。',
      '5. 不要输出参考列表、解释说明或代码块，只输出 JSON。',
      '6. JSON 格式必须为 {"title":"...","body":"..."}。',
      '',
      `用户初始想法：${initialIdea}`,
      '',
      '参考资料：',
      referenceText,
    ].join('\n');
  }

  private parseGeneratedArticle(
    raw: string,
    initialIdea: string,
    references: RankedReference[],
  ): { title: string; body: string } {
    const normalized = raw.trim();

    try {
      const jsonStart = normalized.indexOf('{');
      const jsonEnd = normalized.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(normalized.slice(jsonStart, jsonEnd + 1)) as {
          title?: string;
          body?: string;
        };

        if (parsed.title?.trim() && parsed.body?.trim()) {
          return {
            title: parsed.title.trim(),
            body: parsed.body.trim(),
          };
        }
      }
    } catch {
      // Ignore and fall back to a forgiving parser.
    }

    const lines = normalized
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const firstLine = lines[0]?.replace(/^#\s*/, '') || `${initialIdea.slice(0, 20)}工作草稿`;
    const remainingBody = lines.slice(1).join('\n\n').trim();

    if (remainingBody) {
      return {
        title: firstLine,
        body: remainingBody,
      };
    }

    return this.buildFallbackArticle(initialIdea, references);
  }

  private buildFallbackArticle(
    initialIdea: string,
    references: RankedReference[],
  ): { title: string; body: string } {
    const title = `${initialIdea.slice(0, 18)}${initialIdea.length > 18 ? '...' : ''}的工作草稿`;
    const referenceSection = references.length === 0
      ? '目前资料库里没有明显强匹配的参考，这意味着接下来的判断需要边写边补证据。'
      : references
        .map((reference, index) => `${index + 1}. ${reference.title}：${reference.reason}`)
        .join('\n');

    return {
      title,
      body: [
        '## 这次我想解决的问题',
        initialIdea,
        '',
        '## 当前可以借用的背景材料',
        referenceSection,
        '',
        '## 下一步可以继续展开的方向',
        '先把关键判断、核心证据和待验证的问题拆开，再逐段补足论据与例子。',
      ].join('\n'),
    };
  }

  private buildExcerpt(body: string): string {
    return body
      .replace(/[#>*`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }

  private extractKeywords(text: string): string[] {
    const normalized = this.normalize(text);
    const tokens = new Set<string>();
    const englishWords = normalized.match(/[a-z0-9]{2,}/g) || [];
    for (const word of englishWords) {
      if (word.length >= 2) {
        tokens.add(word);
      }
    }

    const chineseSegments = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
    for (const segment of chineseSegments) {
      tokens.add(segment);
      if (segment.length > 4) {
        for (let size = 2; size <= 4; size += 1) {
          for (let index = 0; index <= segment.length - size; index += 1) {
            tokens.add(segment.slice(index, index + size));
          }
        }
      }
    }

    return Array.from(tokens)
      .filter((token) => token.length >= 2)
      .slice(0, 24);
  }

  private readStringArray(
    value: Array<Record<string, unknown>> | null | undefined,
    key: string,
  ): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => item?.[key])
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\p{Letter}\p{Number}\u4e00-\u9fff]+/gu, ' ')
      .trim();
  }

  private async recordProfileSignal(
    userId: string,
    initialIdea: string,
    references: RankedReference[],
  ) {
    const contentTags = references.flatMap((reference) => this.extractKeywords(reference.title)).slice(0, 12);

    try {
      await this.userProfileService.updateProfile(userId, {
        userId,
        eventType: BehaviorEventType.SEARCH_QUERY,
        timestamp: new Date(),
        contentTags,
        metadata: {
          query: initialIdea,
          source: 'workspace_article_generation',
        },
      });
    } catch (error) {
      this.logger.debug(
        `Skipping profile update for workspace generation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
