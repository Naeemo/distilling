import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceItemStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { UserProfileService } from '../output/user-profile.service';
import { WorkspaceGenerationService } from './workspace-generation.service';

const tx: any = {
  workspaceReference: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  workspaceItem: {
    update: jest.fn(),
  },
};

const mockPrisma: any = {
  workspaceItem: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  content: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<void>) => callback(tx)),
};

const mockAiService: any = {
  generateText: jest.fn(),
};

const mockUserProfileService: any = {
  updateProfile: jest.fn(),
};

describe('WorkspaceGenerationService', () => {
  let service: WorkspaceGenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceGenerationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAiService },
        { provide: UserProfileService, useValue: mockUserProfileService },
      ],
    }).compile();

    service = module.get<WorkspaceGenerationService>(WorkspaceGenerationService);
    jest.clearAllMocks();
  });

  it('promotes a generated article to READY and stores references', async () => {
    mockPrisma.workspaceItem.findUnique.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      initialIdea: 'AI agent 团队协作怎么落地',
    });
    mockPrisma.content.findMany.mockResolvedValue([
      {
        id: 'content_1',
        title: 'AI agent 团队协作实践',
        contentText: '讨论 AI agent 在多人协作中的任务拆分。',
        summary: '任务拆分与交付可靠性。',
        metadata: null,
        insights: {
          topics: [{ name: 'AI agent' }, { name: '团队协作' }],
          keyClaims: ['任务拆分决定稳定性'],
          keyEntities: [{ name: 'OpenAI' }],
        },
        tags: [{ tag: { name: 'AI' } }],
      },
    ]);
    mockAiService.generateText.mockResolvedValue({
      text: JSON.stringify({
        title: 'AI agent 团队协作落地观察',
        body: '## 导语\n\n一篇工作区草稿。',
      }),
      tokensUsed: 123,
      model: 'test-model',
    });
    mockUserProfileService.updateProfile.mockResolvedValue(undefined);

    await service.generateArticle('workspace_1');

    expect(tx.workspaceReference.createMany).toHaveBeenCalled();
    expect(tx.workspaceItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WorkspaceItemStatus.READY,
          title: 'AI agent 团队协作落地观察',
        }),
      }),
    );
  });

  it('marks article as FAILED when generation raises', async () => {
    mockPrisma.workspaceItem.findUnique.mockResolvedValue({
      id: 'workspace_1',
      userId: 'user_1',
      initialIdea: 'AI agent 团队协作怎么落地',
    });
    mockPrisma.content.findMany.mockResolvedValue([]);
    mockAiService.generateText.mockRejectedValue(new Error('LLM down'));

    await service.generateArticle('workspace_1');

    expect(mockPrisma.workspaceItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WorkspaceItemStatus.FAILED,
          generationError: 'LLM down',
        }),
      }),
    );
  });
});
