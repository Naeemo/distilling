import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceItemStatus, WorkspaceItemType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileService } from '../output/user-profile.service';
import { WorkspaceGenerationService } from './workspace-generation.service';
import { WorkspaceService } from './workspace.service';

const mockPrisma: any = {
  workspaceItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockGenerationService: any = {
  generateArticle: jest.fn(),
};

const mockUserProfileService: any = {
  updateProfile: jest.fn(),
};

describe('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WorkspaceGenerationService, useValue: mockGenerationService },
        { provide: UserProfileService, useValue: mockUserProfileService },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    jest.clearAllMocks();
  });

  it('creates an article in GENERATING state and starts async generation', async () => {
    mockPrisma.workspaceItem.create.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      type: WorkspaceItemType.ARTICLE,
      status: WorkspaceItemStatus.GENERATING,
      initialIdea: 'AI agent 协作怎么落地',
      title: '生成中...',
      body: null,
      excerpt: null,
      generationError: null,
      lastGeneratedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockGenerationService.generateArticle.mockResolvedValue(undefined);

    const result = await service.createArticle('user_1', 'AI agent 协作怎么落地');

    expect(result.status).toBe(WorkspaceItemStatus.GENERATING);
    expect(result.referenceCount).toBe(0);
    expect(mockGenerationService.generateArticle).toHaveBeenCalledWith('workspace_1');
  });

  it('lists articles ordered payload with reference counts', async () => {
    mockPrisma.workspaceItem.findMany.mockResolvedValue([
      {
        id: 'workspace_1',
        userId: 'user_1',
        type: WorkspaceItemType.ARTICLE,
        status: WorkspaceItemStatus.READY,
        initialIdea: 'test',
        title: 'ready',
        body: 'body',
        excerpt: 'excerpt',
        generationError: null,
        lastGeneratedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          references: 3,
        },
      },
    ]);

    const result = await service.listArticles('user_1');

    expect(result).toHaveLength(1);
    expect(result[0]?.referenceCount).toBe(3);
    expect(result[0]?.hasFewReferences).toBe(false);
  });

  it('updates a ready article and records a profile signal', async () => {
    mockPrisma.workspaceItem.findFirst.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      type: WorkspaceItemType.ARTICLE,
      status: WorkspaceItemStatus.READY,
      title: '旧标题',
      body: '旧正文',
      excerpt: '旧摘要',
      generationError: null,
    });
    mockPrisma.workspaceItem.update.mockResolvedValue({
      id: 'workspace_1',
      title: '新标题',
      body: '新正文',
      excerpt: '新正文',
      status: WorkspaceItemStatus.READY,
    });
    mockUserProfileService.updateProfile.mockResolvedValue(undefined);

    const result = await service.updateArticle('user_1', 'workspace_1', {
      title: '新标题',
      body: '新正文',
    });

    expect(result.status).toBe(WorkspaceItemStatus.READY);
    expect(mockUserProfileService.updateProfile).toHaveBeenCalled();
  });

  it('does not allow editing while the article is generating', async () => {
    mockPrisma.workspaceItem.findFirst.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      type: WorkspaceItemType.ARTICLE,
      status: WorkspaceItemStatus.GENERATING,
      title: '生成中...',
      body: null,
      excerpt: null,
      generationError: null,
    });

    await expect(
      service.updateArticle('user_1', 'workspace_1', {
        title: '不该成功',
      }),
    ).rejects.toThrow('Article is still generating');
  });

  it('retries a failed article and starts generation again', async () => {
    mockPrisma.workspaceItem.findFirst.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      type: WorkspaceItemType.ARTICLE,
      status: WorkspaceItemStatus.FAILED,
    });
    mockPrisma.workspaceItem.update.mockResolvedValue({
      id: 'workspace_1',
      status: WorkspaceItemStatus.GENERATING,
    });
    mockGenerationService.generateArticle.mockResolvedValue(undefined);

    const result = await service.retryArticle('user_1', 'workspace_1');

    expect(result.status).toBe(WorkspaceItemStatus.GENERATING);
    expect(mockGenerationService.generateArticle).toHaveBeenCalledWith('workspace_1');
  });
});
