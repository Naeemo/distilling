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
  provider: string; // openai, stepfun, etc.
  baseURL: string;
  apiKey: string;
  defaultModel: string;
  models: string[];
}