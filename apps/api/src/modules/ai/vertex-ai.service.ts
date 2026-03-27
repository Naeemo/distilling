import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface VertexPart {
  text: string;
}

interface VertexContent {
  role: 'user' | 'model';
  parts: VertexPart[];
}

@Injectable()
export class VertexAiService {
  private readonly projectId: string;
  private readonly location: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.projectId =
      this.configService.get('GOOGLE_CLOUD_PROJECT') ||
      this.configService.get('GCP_PROJECT_ID') ||
      '';
    this.location = this.configService.get('VERTEX_AI_LOCATION', 'global');
    this.model = this.configService.get('VERTEX_AI_MODEL', 'gemini-2.0-flash');
  }

  async chatCompletion(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<string> {
    const { model = this.model, temperature = 0.7, maxTokens = 2000 } = options;
    const data = await this.callModel(messages, { model, temperature, maxTokens });
    return this.extractText(data);
  }

  async *chatCompletionStream(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<string> {
    const text = await this.chatCompletion(messages, options);
    if (text) {
      yield text;
    }
  }

  async generateText(
    prompt: string,
    options: ChatOptions = {},
  ): Promise<{ text: string; usageMetadata?: { totalTokenCount?: number } }> {
    const data = await this.callModel([{ role: 'user', content: prompt }], options);
    return {
      text: this.extractText(data),
      usageMetadata: data?.usageMetadata,
    };
  }

  private async callModel(messages: ChatMessage[], options: ChatOptions) {
    if (!this.projectId) {
      throw new Error('Missing GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID for Vertex AI');
    }

    const { model = this.model, temperature = 0.7, maxTokens = 2000 } = options;
    const accessToken = await this.getAccessToken();
    const endpoint =
      `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}` +
      `/locations/${this.location}/publishers/google/models/${model}:generateContent`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        contents: this.toVertexContents(messages),
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vertex AI error: ${error}`);
    }

    return response.json();
  }

  private toVertexContents(messages: ChatMessage[]): VertexContent[] {
    return messages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
  }

  private extractText(data: any): string {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      return '';
    }

    return parts
      .map((part) => part?.text || '')
      .join('')
      .trim();
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: {
          'Metadata-Flavor': 'Google',
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get GCP access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }
}
