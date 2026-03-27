import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigDto, UpdateSystemConfigDto, CreateSystemConfigDto, LLMConfigDto } from './dto';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  // ==================== 通用配置操作 ====================

  async findAll(category?: string): Promise<SystemConfigDto[]> {
    const configs = await this.prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: { category: 'asc', key: 'asc' },
    });

    return configs.map(config => ({
      ...config,
      // 敏感信息脱敏显示
      value: config.isSecret ? this.maskSecret(config.value) : config.value,
    }));
  }

  async findByKey(key: string): Promise<SystemConfigDto | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) return null;

    return {
      ...config,
      value: config.isSecret ? this.maskSecret(config.value) : config.value,
    };
  }

  async getValue(key: string): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value || null;
  }

  async create(data: CreateSystemConfigDto, userId: string): Promise<SystemConfigDto> {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: data.key },
    });

    if (existing) {
      throw new BadRequestException(`配置项 ${data.key} 已存在`);
    }

    const config = await this.prisma.systemConfig.create({
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return config;
  }

  async update(key: string, data: UpdateSystemConfigDto, userId: string): Promise<SystemConfigDto> {
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        ...data,
        updatedBy: userId,
      },
    });

    return config;
  }

  async delete(key: string): Promise<void> {
    await this.prisma.systemConfig.delete({
      where: { key },
    });
  }

  // ==================== LLM 配置专用方法 ====================

  async getLLMConfig(): Promise<LLMConfigDto> {
    const [
      provider,
      baseURL,
      apiKey,
      defaultModel,
      models,
    ] = await Promise.all([
      this.getValue('LLM_PROVIDER'),
      this.getValue('LLM_BASE_URL'),
      this.getValue('LLM_API_KEY'),
      this.getValue('LLM_DEFAULT_MODEL'),
      this.getValue('LLM_MODELS'),
    ]);

    return {
      provider: provider || 'stepfun',
      baseURL: baseURL || 'https://api.stepfun.com/v1',
      apiKey: apiKey || '',
      defaultModel: defaultModel || 'step-3.5-flash',
      models: models ? JSON.parse(models) : ['step-3.5-flash'],
    };
  }

  async saveLLMConfig(config: LLMConfigDto, userId: string): Promise<void> {
    const configs = [
      { key: 'LLM_PROVIDER', value: config.provider, isSecret: false },
      { key: 'LLM_BASE_URL', value: config.baseURL, isSecret: false },
      { key: 'LLM_API_KEY', value: config.apiKey, isSecret: true },
      { key: 'LLM_DEFAULT_MODEL', value: config.defaultModel, isSecret: false },
      { key: 'LLM_MODELS', value: JSON.stringify(config.models), isSecret: false },
    ];

    for (const item of configs) {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: item.key },
      });

      if (existing) {
        await this.prisma.systemConfig.update({
          where: { key: item.key },
          data: {
            value: item.value,
            updatedBy: userId,
          },
        });
      } else {
        await this.prisma.systemConfig.create({
          data: {
            key: item.key,
            value: item.value,
            category: 'llm',
            isSecret: item.isSecret,
            updatedBy: userId,
          },
        });
      }
    }
  }

  // ==================== 初始化默认配置 ====================

  async initializeDefaults(): Promise<void> {
    const defaults = [
      {
        key: 'LLM_PROVIDER',
        value: 'stepfun',
        category: 'llm',
        isSecret: false,
        description: 'LLM 提供商 (openai, stepfun, etc.)',
      },
      {
        key: 'LLM_BASE_URL',
        value: 'https://api.stepfun.com/v1',
        category: 'llm',
        isSecret: false,
        description: 'API 基础 URL',
      },
      {
        key: 'LLM_DEFAULT_MODEL',
        value: 'step-3.5-flash',
        category: 'llm',
        isSecret: false,
        description: '默认使用的模型',
      },
      {
        key: 'LLM_MODELS',
        value: JSON.stringify(['step-3.5-flash', 'step-3.5-turbo', 'step-4']),
        category: 'llm',
        isSecret: false,
        description: '可用模型列表 (JSON 数组)',
      },
    ];

    for (const item of defaults) {
      const existing = await this.prisma.systemConfig.findUnique({
        where: { key: item.key },
      });

      if (!existing) {
        await this.prisma.systemConfig.create({
          data: item,
        });
      }
    }
  }

  // ==================== 工具方法 ====================

  private maskSecret(value: string): string {
    if (!value || value.length <= 8) return '***';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }
}