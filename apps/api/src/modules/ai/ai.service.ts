import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { VertexAiService } from './vertex-ai.service';

@Injectable()
export class AiService {
  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
    private systemConfig: SystemConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private readonly vertexAi: VertexAiService,
  ) {}

  /**
   * 根据配置生成文本（Vertex AI 或自定义 OpenAI 兼容）
   */
  private async generateWithConfig(
    prompt: string,
    options: { model?: string; maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; usageMetadata?: { totalTokenCount: number } }> {
    const config = await this.systemConfig.getLLMConfig();

    if (config.providerType === 'vertex-ai') {
      // 使用 Vertex AI
      return this.vertexAi.generateText(prompt, {
        model: options.model || config.defaultModel,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });
    } else {
      // 使用自定义 OpenAI 兼容 API
      return this.generateWithOpenAICompatible(prompt, config, options);
    }
  }

  /**
   * OpenAI 兼容 API 调用
   */
  private async generateWithOpenAICompatible(
    prompt: string,
    config: { baseURL: string; apiKey: string; defaultModel: string },
    options: { model?: string; maxTokens?: number; temperature?: number }
  ): Promise<{ text: string; usageMetadata?: { totalTokenCount: number } }> {
    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || config.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes content accurately and concisely.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const totalTokenCount = data.usage?.total_tokens || this.estimateTokens(prompt + text);

    return {
      text,
      usageMetadata: { totalTokenCount },
    };
  }

  /**
   * 获取默认模型
   */
  private async getDefaultModel(): Promise<string> {
    try {
      const config = await this.systemConfig.getLLMConfig();
      return config.defaultModel;
    } catch {
      return this.configService.get('VERTEX_AI_MODEL', 'gemini-2.0-flash');
    }
  }

  async generateSummary(
    contentId: string,
    type: 'QUICK' | 'DETAILED' | 'BULLET' | 'QA',
    onChunk?: (chunk: string) => void,
  ): Promise<{ summaryId: string; summaryText: string; tokensUsed: number }> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundException('Content not found');
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(content.contentText || '', type);
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      const cachedData = JSON.parse(cached);
      // 保存到数据库并返回
      const summary = await this.prisma.summary.create({
        data: {
          contentId,
          summaryType: type,
          summaryText: cachedData.text,
          tokensUsed: cachedData.tokensUsed,
          model: cachedData.model,
        },
      });
      
      return {
        summaryId: summary.id,
        summaryText: cachedData.text,
        tokensUsed: cachedData.tokensUsed,
      };
    }

    // 生成摘要
    const prompt = this.buildPrompt(content.contentText || '', type);
    const model = await this.getDefaultModel();
    const maxTokens = type === 'QUICK' ? 200 : 500;

    let summaryText = '';
    let tokensUsed = 0;

    try {
      const result = await this.generateWithConfig(prompt, {
        model,
        maxTokens,
        temperature: 0.3,
      });
      summaryText = result.text;
      tokensUsed =
        result.usageMetadata?.totalTokenCount || this.estimateTokens(prompt + summaryText);

      if (onChunk && summaryText) {
        onChunk(summaryText);
      }
    } catch (error) {
      console.error('LLM API error:', error);
      summaryText = this.fallbackSummarize(content.contentText || '', type);
      tokensUsed = 0;
    }

    // 保存摘要到数据库
    const summary = await this.prisma.summary.create({
      data: {
        contentId,
        summaryType: type,
        summaryText,
        tokensUsed,
        model,
      },
    });

    // 更新内容的当前摘要
    await this.prisma.content.update({
      where: { id: contentId },
      data: { summary: summaryText },
    });

    // 缓存结果（24小时）
    await this.redis.setex(
      cacheKey,
      24 * 60 * 60,
      JSON.stringify({ text: summaryText, tokensUsed, model }),
    );

    return {
      summaryId: summary.id,
      summaryText,
      tokensUsed,
    };
  }

  async getSummaries(contentId: string) {
    return this.prisma.summary.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getCacheKey(content: string, type: string): string {
    const hash = createHash('sha256').update(content + type).digest('hex');
    return `summary:${hash}`;
  }

  private buildPrompt(content: string, type: string): string {
    const maxLength = 8000;
    const truncated = content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;

    switch (type) {
      case 'QUICK':
        return `Please provide a quick summary of the following content in 3-5 sentences:\n\n${truncated}`;
      case 'DETAILED':
        return `Please provide a detailed summary of the following content with structured paragraphs:\n\n${truncated}`;
      case 'BULLET':
        return `Please summarize the following content as 3-7 bullet points:\n\n${truncated}`;
      case 'QA':
        return `Please summarize the following content in a Q&A format:\n\n${truncated}`;
      default:
        return `Please summarize the following content:\n\n${truncated}`;
    }
  }

  private estimateTokens(text: string): number {
    // 粗略估算：英文约1 token/4字符，中文约1 token/1.5字符
    return Math.ceil(text.length / 3);
  }

  private fallbackSummarize(content: string, type: string): string {
    // 简单的备用摘要方案
    const sentences = content
      .replace(/([.!?。！？])\s+/g, "$1\n")
      .split('\n')
      .filter(s => s.trim().length > 20);

    if (sentences.length === 0) {
      return content.substring(0, 200) + '...';
    }

    switch (type) {
      case 'QUICK':
        return sentences.slice(0, 5).join(' ');
      case 'BULLET':
        return sentences.slice(0, 7).map(s => `• ${s.trim()}`).join('\n');
      default:
        return sentences.slice(0, 10).join(' ');
    }
  }
}