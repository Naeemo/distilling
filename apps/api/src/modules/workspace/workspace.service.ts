import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceItemStatus, WorkspaceItemType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileService } from '../output/user-profile.service';
import { BehaviorEventType } from '../output/user-profile.types';
import { WorkspaceGenerationService } from './workspace-generation.service';

type WorkspaceArticleUpdateInput = {
  title?: string;
  body?: string;
};

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceGenerationService: WorkspaceGenerationService,
    private readonly userProfileService: UserProfileService,
  ) {}

  async createArticle(userId: string, initialIdea: string) {
    const item = await this.prisma.workspaceItem.create({
      data: {
        userId,
        type: WorkspaceItemType.ARTICLE,
        status: WorkspaceItemStatus.GENERATING,
        initialIdea,
      },
    });

    void this.workspaceGenerationService.generateArticle(item.id);

    return {
      ...item,
      referenceCount: 0,
      references: [],
    };
  }

  async listArticles(userId: string) {
    const items = await this.prisma.workspaceItem.findMany({
      where: {
        userId,
        type: WorkspaceItemType.ARTICLE,
      },
      include: {
        _count: {
          select: {
            references: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      initialIdea: item.initialIdea,
      title: item.title,
      body: item.body,
      excerpt: item.excerpt,
      generationError: item.generationError,
      lastGeneratedAt: item.lastGeneratedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      referenceCount: item._count.references,
      hasFewReferences: item._count.references < 2,
    }));
  }

  async getArticle(userId: string, id: string) {
    const item = await this.prisma.workspaceItem.findFirst({
      where: {
        id,
        userId,
        type: WorkspaceItemType.ARTICLE,
      },
      include: {
        references: {
          orderBy: { rank: 'asc' },
          include: {
            content: {
              select: {
                id: true,
                title: true,
                summary: true,
                url: true,
                metadata: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Workspace article not found');
    }

    return {
      id: item.id,
      type: item.type,
      status: item.status,
      initialIdea: item.initialIdea,
      title: item.title,
      body: item.body,
      excerpt: item.excerpt,
      generationError: item.generationError,
      lastGeneratedAt: item.lastGeneratedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      references: item.references.map((reference) => ({
        contentId: reference.contentId,
        title: reference.content.title,
        summary: reference.content.summary,
        score: reference.score,
        reason: reference.reason || '与当前写作主题相关',
        rank: reference.rank,
        url: reference.content.url,
        createdAt: reference.content.createdAt,
        metadata: reference.content.metadata,
      })),
      hasFewReferences: item.references.length < 2,
    };
  }

  async updateArticle(userId: string, id: string, input: WorkspaceArticleUpdateInput) {
    const item = await this.prisma.workspaceItem.findFirst({
      where: {
        id,
        userId,
        type: WorkspaceItemType.ARTICLE,
      },
    });

    if (!item) {
      throw new NotFoundException('Workspace article not found');
    }

    if (item.status === WorkspaceItemStatus.GENERATING) {
      throw new BadRequestException('Article is still generating');
    }

    if (!input.title && !input.body) {
      throw new BadRequestException('Nothing to update');
    }

    const nextBody = input.body ?? item.body ?? '';
    const updated = await this.prisma.workspaceItem.update({
      where: { id: item.id },
      data: {
        title: input.title ?? item.title,
        body: nextBody,
        excerpt: nextBody ? this.buildExcerpt(nextBody) : item.excerpt,
        generationError: item.status === WorkspaceItemStatus.FAILED ? null : item.generationError,
        status: WorkspaceItemStatus.READY,
      },
    });

    await this.recordEditSignal(userId, updated.title);

    return updated;
  }

  async retryArticle(userId: string, id: string) {
    const item = await this.prisma.workspaceItem.findFirst({
      where: {
        id,
        userId,
        type: WorkspaceItemType.ARTICLE,
      },
    });

    if (!item) {
      throw new NotFoundException('Workspace article not found');
    }

    if (item.status === WorkspaceItemStatus.GENERATING) {
      throw new BadRequestException('Article is already generating');
    }

    const updated = await this.prisma.workspaceItem.update({
      where: { id },
      data: {
        status: WorkspaceItemStatus.GENERATING,
        generationError: null,
      },
    });

    void this.workspaceGenerationService.generateArticle(updated.id);

    return updated;
  }

  private buildExcerpt(body: string): string {
    return body
      .replace(/[#>*`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
  }

  private async recordEditSignal(userId: string, title: string) {
    try {
      await this.userProfileService.updateProfile(userId, {
        userId,
        eventType: BehaviorEventType.TOPIC_EXPLORE,
        timestamp: new Date(),
        metadata: {
          topic: title,
          source: 'workspace_article_edit',
        },
      });
    } catch {
      // Workspace should stay available even if profile enrichment fails.
    }
  }
}
