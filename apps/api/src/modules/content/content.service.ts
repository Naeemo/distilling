import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Inject 
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { ContentStatus } from '@prisma/client';
import { BrowserService } from '../browser/browser.service';
import Redis from 'ioredis';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private browserService: BrowserService,
  ) {}

  async createFromUrl(userId: string, url: string, tagIds?: string[]) {
    // 检查URL是否已存在
    const existing = await this.prisma.content.findFirst({
      where: { userId, url },
    });

    if (existing) {
      return {
        ...existing,
        isExisting: true,
      };
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

    return {
      ...content,
      isExisting: false,
    };
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

    if (status && status !== 'undefined') {
      where.status = status;
    }

    if (tagId && tagId !== 'undefined') {
      where.tags = {
        some: { tagId },
      };
    }

    if (search && search !== 'undefined') {
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

  private normalizeMetadataUrl(urlValue?: string, baseUrl?: string) {
    if (!urlValue) return urlValue;

    try {
      const normalized = new URL(urlValue, baseUrl);
      if (normalized.protocol === 'http:') {
        normalized.protocol = 'https:';
      }
      return normalized.toString();
    } catch {
      return urlValue.replace(/^http:\/\//i, 'https://');
    }
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

    // 验证并转换状态
    const validStatus = status as ContentStatus;
    if (!Object.values(ContentStatus).includes(validStatus)) {
      throw new BadRequestException('Invalid status');
    }

    return this.prisma.content.update({
      where: { id },
      data: { status: validStatus },
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
      const coverImage = this.normalizeMetadataUrl(
        $('meta[property="og:image"]').attr('content') ||
          $('meta[name="twitter:image"]').attr('content'),
        url,
      );
      const siteName = $('meta[property="og:site_name"]').attr('content');

      if (this.isWechatArticle(url)) {
        return this.fetchWithBrowserFallback(url, {
          title: $('meta[property="og:title"]').attr('content') || title,
          author: $('#js_name').text().trim() || author,
          publishDate,
          coverImage,
          siteName,
        });
      }

      // 使用 Readability 提取正文
      let contentText = '';
      try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        contentText = article?.textContent || '';
      } catch {
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

      if (contentText.length < 500) {
        return this.fetchWithBrowserFallback(url, {
          title,
          author,
          publishDate,
          coverImage,
          siteName,
        });
      }

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
    } catch (error: any) {
      try {
        return await this.fetchWithBrowserFallback(url);
      } catch {
        throw new BadRequestException(`Failed to fetch URL: ${error.message}`);
      }
    }
  }

  private isWechatArticle(url: string): boolean {
    return url.includes('mp.weixin.qq.com');
  }

  private async fetchWithBrowserFallback(
    url: string,
    metadataFallback?: {
      title?: string;
      author?: string | null;
      publishDate?: string;
      coverImage?: string;
      siteName?: string;
    },
  ) {
    const extracted = await this.browserService.extractContent(url);
    const contentText = extracted.content
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 50000);

    if (!contentText) {
      throw new Error('No content extracted from browser fallback');
    }

    return {
      title: extracted.title?.trim() || metadataFallback?.title?.trim() || 'Untitled',
      contentText,
      metadata: {
        author: extracted.author || metadataFallback?.author || null,
        publishDate: metadataFallback?.publishDate,
        coverImage: metadataFallback?.coverImage,
        siteName: metadataFallback?.siteName,
      },
    };
  }

  async quickAdd(userId: string, shareText: string, tags?: string[], note?: string) {
    // 从分享文本中提取 URL
    const url = this.extractUrlFromText(shareText);
    
    if (!url) {
      throw new BadRequestException('No URL found in share text');
    }

    // 检查URL是否已存在
    const existing = await this.prisma.content.findFirst({
      where: { userId, url },
    });

    if (existing) {
      // 如果已存在，返回已有内容信息
      return {
        success: true,
        contentId: existing.id,
        title: existing.title,
        url: existing.url,
        message: 'Content already exists',
        isExisting: true,
      };
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
        metadata: {
          ...metadata,
          quickAddNote: note,
          quickAddSource: 'ios_shortcut',
        },
        sourceType: 'WEB',
      },
    });

    // 添加标签关联
    if (tags && tags.length > 0) {
      // 查找或创建标签
      for (const tagName of tags) {
        const tag = await this.prisma.tag.upsert({
          where: { 
            userId_name: { userId, name: tagName }
          },
          update: {},
          create: {
            userId,
            name: tagName,
            color: this.getRandomTagColor(),
          },
        });

        await this.prisma.contentTag.create({
          data: {
            contentId: content.id,
            tagId: tag.id,
          },
        });
      }
    }

    // 创建初始复习计划
    await this.createInitialReview(userId, content.id);

    return {
      success: true,
      contentId: content.id,
      title: content.title,
      url: content.url,
      message: 'Content added successfully',
      isExisting: false,
    };
  }

  private extractUrlFromText(text: string): string | null {
    // 匹配 URL 的正则表达式
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const match = text.match(urlRegex);
    return match ? match[1] : null;
  }

  private getRandomTagColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
