export class SystemConfigDto {
  id: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
  category: string;
  updatedAt: Date;
}

export class UpdateSystemConfigDto {
  value: string;
  description?: string;
}

export class CreateSystemConfigDto {
  key: string;
  value: string;
  description?: string;
  isSecret?: boolean;
  category?: string;
}

export class LLMConfigDto {
  providerType: 'vertex-ai' | 'custom'; // 内置 Vertex AI 或自定义
  provider: string; // 显示名称
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  models: string[];
}