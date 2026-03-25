import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const tags = await this.prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { contents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      contentCount: tag._count.contents,
    }));
  }

  async create(userId: string, name: string, color?: string) {
    return this.prisma.tag.create({
      data: {
        userId,
        name,
        color: color || '#3b82f6',
      },
    });
  }

  async addTagToContent(contentId: string, tagId: string) {
    await this.prisma.contentTag.create({
      data: {
        contentId,
        tagId,
      },
    });

    return { success: true };
  }

  async removeTagFromContent(contentId: string, tagId: string) {
    await this.prisma.contentTag.delete({
      where: {
        contentId_tagId: {
          contentId,
          tagId,
        },
      },
    });

    return { success: true };
  }
}
