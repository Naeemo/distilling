import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HighlightService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: {
      contentId: string;
      highlightText: string;
      position: { startOffset: number; endOffset: number; paragraphIndex?: number };
      color?: string;
      note?: string;
    },
  ) {
    return this.prisma.highlight.create({
      data: {
        userId,
        contentId: data.contentId,
        highlightText: data.highlightText,
        position: data.position,
        color: data.color || 'yellow',
        note: data.note,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: { note?: string; color?: string },
  ) {
    const highlight = await this.prisma.highlight.findFirst({
      where: { id, userId },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    return this.prisma.highlight.update({
      where: { id },
      data,
    });
  }

  async delete(userId: string, id: string) {
    const highlight = await this.prisma.highlight.findFirst({
      where: { id, userId },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    await this.prisma.highlight.delete({
      where: { id },
    });

    return { success: true };
  }
}
