import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailForwardingService } from './email-forwarding.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

let Readability: any;
try {
  const { Readability: R } = require('@mozilla/readability');
  Readability = R;
} catch {
  Readability = null;
}

interface EmailPayload {
  to: string;           // 收件人（专属邮箱地址）
  from: string;         // 发件人
  subject: string;      // 邮件主题
  text?: string;        // 纯文本内容
  html?: string;        // HTML内容
}

interface ParsedEmailContent {
  url?: string;
  title?: string;
  notes?: string;
}

@Injectable()
export class EmailReceivingService {
  private readonly logger = new Logger(EmailReceivingService.name);

  constructor(
    private prisma: PrismaService,
    private emailForwardingService: EmailForwardingService,
  ) {}

  /**
   * 接收并处理邮件
   */
  async receiveEmail(payload: EmailPayload): Promise<{ success: boolean; message: string }> {
    const { to, from, subject, text, html } = payload;

    // 1. 查找对应的用户
    const userId = await this.emailForwardingService.findUserByEmailAddress(to);
    
    if (!userId) {
      this.logger.warn(`收到未知邮箱地址的邮件: ${to}`);
      return { success: false, message: '邮箱地址未注册' };
    }

    // 2. 保存原始邮件
    const emailRecord = await this.prisma.emailReceived.create({
      data: {
        emailAddress: to,
        fromAddress: from,
        subject: subject,
        body: text || html || '',
        status: 'PENDING',
      },
    });

    // 3. 异步处理邮件
    this.processEmail(emailRecord.id, userId, payload).catch(error => {
      this.logger.error(`处理邮件失败: ${emailRecord.id}`, error);
    });

    return { success: true, message: '邮件已接收，正在处理' };
  }

  /**
   * 解析邮件内容
   */
  private parseEmailContent(subject: string, body: string): ParsedEmailContent {
    const result: ParsedEmailContent = {};

    // 提取 URL（支持 http/https）
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = body.match(urlRegex);
    
    if (urls && urls.length > 0) {
      result.url = urls[0]; // 取第一个 URL
    }

    // 提取标题：优先使用邮件主题
    result.title = subject?.trim() || undefined;

    // 提取笔记：URL 之后的非空行作为笔记
    const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const urlIndex = lines.findIndex(l => l.includes(result.url || ''));
    
    if (urlIndex >= 0 && urlIndex < lines.length - 1) {
      // URL 之后的行作为笔记
      const noteLines = lines.slice(urlIndex + 1);
      result.notes = noteLines.join('\n');
    }

    return result;
  }

  /**
   * 抓取网页内容
   */
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

      const title = $('title').text() || $('h1').first().text() || 'Untitled';
      const author = $('meta[name="author"]').attr('content') ||
                     $('meta[property="article:author"]').attr('content');
      const publishDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('meta[name="publishdate"]').attr('content');
      const coverImage = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content');
      const siteName = $('meta[property="og:site_name"]').attr('content');

      let contentText = '';
      if (Readability) {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        contentText = article?.textContent || '';
      } else {
        contentText = $('article').text() || 
                      $('main').text() || 
                      $('.content').text() ||
                      $('body').text();
      }

      contentText = contentText
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim()
        .substring(0, 50000);

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
      throw new Error(`Failed to fetch URL: ${error.message}`);
    }
  }

  /**
   * 处理邮件内容
   */
  private async processEmail(
    emailId: string,
    userId: string,
    payload: EmailPayload
  ): Promise<void> {
    try {
      // 更新状态为处理中
      await this.prisma.emailReceived.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      // 解析邮件内容
      const parsed = this.parseEmailContent(payload.subject, payload.text || payload.html || '');

      if (!parsed.url && !parsed.title) {
        throw new Error('无法从邮件中提取有效内容（缺少URL或标题）');
      }

      let contentId: string;

      if (parsed.url) {
        // 抓取网页内容
        const { title, contentText, metadata } = await this.fetchWebContent(parsed.url);

        // 创建内容记录
        const content = await this.prisma.content.create({
          data: {
            userId,
            url: parsed.url,
            title: title || parsed.title || 'Untitled',
            contentText,
            metadata,
            sourceType: 'WEB',
          },
        });

        contentId = content.id;

        // 创建初始复习计划
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await this.prisma.review.create({
          data: {
            userId,
            contentId,
            reviewDate: tomorrow,
          },
        });

        // 如果有笔记，记录日志
        if (parsed.notes) {
          this.logger.log(`邮件包含笔记，已保存到内容: ${contentId}`);
        }
      } else {
        // 纯文本内容
        const content = await this.prisma.content.create({
          data: {
            userId,
            title: parsed.title || '邮件笔记',
            contentText: parsed.notes || payload.text || '',
            sourceType: 'MANUAL',
          },
        });

        contentId = content.id;

        // 创建初始复习计划
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

      // 更新邮件记录
      await this.prisma.emailReceived.update({
        where: { id: emailId },
        data: {
          status: 'COMPLETED',
          parsedUrl: parsed.url,
          parsedTitle: parsed.title,
          parsedNotes: parsed.notes,
          contentId,
          processedAt: new Date(),
        },
      });

      this.logger.log(`邮件处理完成: ${emailId} -> 内容: ${contentId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      await this.prisma.emailReceived.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          errorMessage,
          processedAt: new Date(),
        },
      });

      this.logger.error(`邮件处理失败: ${emailId}`, error);
    }
  }

  /**
   * 获取用户的邮件处理记录
   */
  async getEmailHistory(userId: string, limit = 20) {
    const config = await this.emailForwardingService.getConfig(userId);
    
    if (!config) {
      return [];
    }

    return this.prisma.emailReceived.findMany({
      where: { emailAddress: config.emailAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * 重新处理失败的邮件
   */
  async retryFailedEmail(userId: string, emailId: string) {
    const config = await this.emailForwardingService.getConfig(userId);
    
    if (!config) {
      throw new Error('邮件转发未配置');
    }

    const email = await this.prisma.emailReceived.findFirst({
      where: { 
        id: emailId,
        emailAddress: config.emailAddress,
        status: 'FAILED',
      },
    });

    if (!email) {
      throw new Error('邮件不存在或不可重试');
    }

    // 重新处理
    await this.prisma.emailReceived.update({
      where: { id: emailId },
      data: { status: 'PENDING' },
    });

    this.processEmail(emailId, userId, {
      to: email.emailAddress,
      from: email.fromAddress,
      subject: email.subject,
      text: email.body,
    }).catch(error => {
      this.logger.error(`重试处理邮件失败: ${emailId}`, error);
    });

    return { success: true };
  }
}
