import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from '../system-config/system-config.service';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class StepfunService {
  constructor(
    private configService: ConfigService,
    private systemConfig: SystemConfigService,
  ) {}

  /**
   * 获取 LLM 配置（支持运行时更新）
   */
  private async getLLMConfig(): Promise<{
    apiKey: string;
    baseURL: string;
    defaultModel: string;
  }> {
    try {
      const config = await this.systemConfig.getLLMConfig();
      return {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        defaultModel: config.defaultModel,
      };
    } catch {
      // 数据库未配置时，回退到环境变量
      return {
        apiKey: this.configService.get('OPENAI_API_KEY') || '',
        baseURL: this.configService.get('OPENAI_BASE_URL') || 'https://api.stepfun.com/v1',
        defaultModel: 'step-3.5-flash',
      };
    }
  }

  /**
   * 执行对话补全
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<string> {
    const config = await this.getLLMConfig();
    const { model = config.defaultModel, temperature = 0.7, maxTokens = 2000 } = options;

    try {
      const response = await fetch(`${config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('LLM API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 流式对话补全
   */
  async *chatCompletionStream(
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<string> {
    const config = await this.getLLMConfig();
    const { model = config.defaultModel, temperature = 0.7, maxTokens = 2000 } = options;

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
