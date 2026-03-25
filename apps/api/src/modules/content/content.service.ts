import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Inject 
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';
import * as cheerio from 'cheerio';
import axios from 'axios';

// 动态导入 Readability
let Readability: any;
try {
  const { Readability: R } = require('@mozilla/readability');
  Readability = R;
} catch {
  Readability = null;
}

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async createFromUrl(userId: string, url: string, tagIds?: string[]) {
    // 检查URL是否已存在
    const existing = await this.prisma.content.findFirst({
      where: { userId, url },
    });

    if (existing) {
      throw new BadRequestException('Content with this URL already exists');
    }

    // 抓取网页内容
    const { title, contentText, metadata } = await this.fetchWebContent(url);

    // 创建内容
    const content = await this.prisma.content.create({
      data: {
        userId,
        url,
        title,
        contentText,
        metadata,
        sourceType: 'WEB',
      },
    });

    // 添加标签关联
    if (tagIds && tagIds.length > 0) {
      await this.prisma.contentTag.createMany({
        data: tagIds.map((tagId) => ({
          contentId: content.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // 创建初始复习计划
    await this.createInitialReview(userId, content.id);

    return content;
  }

  async createFromText(userId: string, title: string, contentText: string, tagIds?: string[]) {
    const content = await this.prisma.content.create({
      data: {
        userId,
        title,
        contentText,
        sourceType: 'MANUAL',
      },
    });

    if (tagIds && tagIds.length > 0) {
      await this.prisma.contentTag.createMany({
        data: tagIds.map((tagId) => ({
          contentId: content.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    await this.createInitialReview(userId, content.id);

    return content;
  }

  async findAll(userId: string, params: {
    status?: string;
    tagId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, tagId, search, page = 1, limit = 20 } = params;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { contentText: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        include: {
          tags: {
            include: { tag: true },
          },
          _count: {
            select: { highlights: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(userId: string, id: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, userId },
      include: {
        tags: {
          include: { tag: true },
        },
        highlights: true,
        summaries: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return content;
  }

  async updateStatus(userId: string, id: string, status: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return this.prisma.content.update({
      where: { id },
      data: { status },
    });
  }

  async updateReadingProgress(
    userId: string,
    id: string,
    data: {
      progress: number;
      position?: { scrollY: number; paragraphIndex?: number };
      readingTime?: number;
    },
  ) {
    const content = await this.prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const now = new Date();
    const updateData: any = {
      readingProgress: Math.min(100, Math.max(0, data.progress)),
      lastReadAt: now,
    };

    if (data.position) {
      updateData.readingPosition = {
        ...data.position,
        timestamp: now.toISOString(),
      };
    }

    if (data.readingTime) {
      updateData.readingTime = content.readingTime + data.readingTime;
    }

    // 如果进度超过90%，自动标记为已读
    if (data.progress >= 90 && content.status !== 'READ') {
      updateData.status = 'READ';
    } else if (data.progress > 0 && content.status === 'UNREAD') {
      updateData.status = 'READING';
    }

    return this.prisma.content.update({
      where: { id },
      data: updateData,
    });
  }

  async archive(userId: string, id: string) {
    const content = await this.prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    return this.prisma.content.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  private async fetchWebContent(url: string) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 30000,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // 基础元数据提取
      const title = $('title').text() || $('h1').first().text() || 'Untitled';
      const author = $('meta[name="author"]').attr('content') ||
                     $('meta[property="article:author"]').attr('content');
      const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('meta[name="publishdate"]').attr('content');
      const coverImage = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content');
      const siteName = $('meta[property="og:site_name"]').attr('content');

      // 使用 Readability 提取正文
      let contentText = '';
      if (Readability) {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        contentText = article?.textContent || '';
      } else {
        // 备用方案：使用 cheerio 提取
        contentText = $('article').text() || 
                      $('main').text() || 
                      $('.content').text() ||
                      $('body').text();
      }

      // 清理文本
      contentText = contentText
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 50000); // 限制长度

      return {
        title: title.trim(),
        contentText,
        metadata: {
          author,
          publishDate,
          coverImage,
          siteName,
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to fetch URL: ${error.message}`);
    }
  }

  private async createInitialReview(userId: string, contentId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await this.prisma.review.create({
      data: {
        userId,
        contentId,
        reviewDate: tomorrow,
      },
    });
  }
}
