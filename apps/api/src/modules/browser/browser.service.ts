import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title: string;
  author: string | null;
  content: string;
  url: string;
  wordCount: number;
}

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.logger.log('Initializing Playwright browser...');
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      this.logger.log('Browser initialized successfully');
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Browser closed');
    }
  }

  /**
   * 提取网页内容（通用方法）
   */
  async extractContent(url: string): Promise<ExtractedContent> {
    const browser = await this.init();
    const page = await browser.newPage();

    try {
      this.logger.log(`Navigating to: ${url}`);
      
      // 设置超时和等待策略
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 等待页面内容加载
      await page.waitForLoadState('domcontentloaded');
      
      // 额外等待 JavaScript 渲染
      await page.waitForTimeout(2000);

      // 获取页面内容
      const html = await page.content();
      const $ = cheerio.load(html);

      // 微信文章特殊处理
      if (this.isWechatArticle(url)) {
        return this.parseWechatArticle($, url);
      }

      // 通用文章提取
      return this.parseGenericArticle($, url);

    } catch (error) {
      this.logger.error(`Failed to extract content from ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * 判断是否为微信文章
   */
  private isWechatArticle(url: string): boolean {
    return url.includes('mp.weixin.qq.com');
  }

  /**
   * 解析微信文章
   */
  private parseWechatArticle($: cheerio.CheerioAPI, url: string): ExtractedContent {
    this.logger.log('Parsing WeChat article...');

    // 标题
    const title = $('#activity_name').text().trim() || 
                  $('h1.rich_media_title').text().trim() ||
                  $('h1').first().text().trim();

    // 作者/公众号
    const author = $('#js_name').text().trim() ||
                   $('.profile_nickname').text().trim() ||
                   $('a#js_profile_qrcode').find('.profile_nickname').text().trim();

    // 正文内容 - 微信文章在 #js_content
    let content = '';
    const contentElement = $('#js_content');
    
    if (contentElement.length > 0) {
      // 清理并提取文本
      contentElement.find('script, style').remove();
      
      // 保留段落和图片结构
      content = contentElement.html() || '';
      
      // 转换为 Markdown 格式
      content = this.htmlToMarkdown(content);
    }

    // 如果没有获取到内容，尝试备用选择器
    if (!content) {
      content = $('.rich_media_content').html() || '';
      content = this.htmlToMarkdown(content);
    }

    const wordCount = this.countWords(content);

    this.logger.log(`Extracted WeChat article: "${title}" by ${author}, ${wordCount} words`);

    return {
      title,
      author: author || null,
      content,
      url,
      wordCount,
    };
  }

  /**
   * 解析通用文章
   */
  private parseGenericArticle($: cheerio.CheerioAPI, url: string): ExtractedContent {
    this.logger.log('Parsing generic article...');

    // 尝试多种标题选择器
    const title = $('h1').first().text().trim() ||
                  $('article h1').text().trim() ||
                  $('header h1').text().trim() ||
                  $('title').text().trim();

    // 尝试多种作者选择器
    const author = $('meta[name="author"]').attr('content') ||
                   $('.author').first().text().trim() ||
                   $('[rel="author"]').text().trim() ||
                   null;

    // 尝试提取正文
    let content = '';
    
    // 常见正文容器选择器
    const contentSelectors = [
      'article',
      '[class*="content"]',
      '[class*="article"]',
      'main',
      '.post',
      '.entry',
      '#content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0 && element.text().length > 500) {
        content = element.html() || '';
        content = this.htmlToMarkdown(content);
        break;
      }
    }

    // 如果还是没找到，取 body 中最大的文本块
    if (!content) {
      let maxTextLength = 0;
      let bestContent = '';
      
      $('div, section').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > maxTextLength) {
          maxTextLength = text.length;
          bestContent = $(elem).html() || '';
        }
      });
      
      content = this.htmlToMarkdown(bestContent);
    }

    const wordCount = this.countWords(content);

    return {
      title,
      author,
      content,
      url,
      wordCount,
    };
  }

  /**
   * 简单的 HTML 转 Markdown
   */
  private htmlToMarkdown(html: string): string {
    return html
      // 图片
      .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '![image]($1)')
      // 链接
      .replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)')
      // 标题
      .replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '### $1\n\n')
      // 段落
      .replace(/<p[^>]*>([^<]*)<\/p>/gi, '$1\n\n')
      // 换行
      .replace(/<br\s*\/?>/gi, '\n')
      // 列表
      .replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1\n')
      // 移除其他标签
      .replace(/<[^>]+>/g, '')
      // 解码 HTML 实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      // 清理多余空白
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * 统计字数
   */
  private countWords(text: string): number {
    // 中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 英文单词
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    
    return chineseChars + englishWords;
  }
}
