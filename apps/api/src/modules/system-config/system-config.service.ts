import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigDto, UpdateSystemConfigDto, CreateSystemConfigDto, LLMConfigDto } from './dto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class SystemConfigService {
  // 内存缓存：配置项 -> 值
  private valueCache = new Map<string, CacheEntry<string>>();
  // LLM 配置整体缓存
  private llmConfigCache: CacheEntry<LLMConfigDto> | null = null;
  // 默认缓存 TTL：5分钟
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  constructor(private prisma: PrismaService) {}

  // ==================== 缓存管理 ====================

  /**
   * 清除所有配置缓存（配置更新时调用）
   */
  clearCache(): void {
    this.valueCache.clear();
    this.llmConfigCache = null;
  }

  /**
   * 清除指定 key 的缓存
   */
  clearCacheKey(key: string): void {
    this.valueCache.delete(key);
    // LLM 相关配置变更时，清除整体缓存
    if (key.startsWith('LLM_')) {
      this.llmConfigCache = null;
    }
  }

  private getCached<T>(cache: CacheEntry<T> | null): T | null {
    if (!cache) return null;
    if (Date.now() > cache.expiresAt) return null;
    return cache.data;
  }

  private setCache<T>(data: T, ttl = this.DEFAULT_TTL): CacheEntry<T> {
    return {
      data,
      expiresAt: Date.now() + ttl,
    };
  }

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

  async getValue(key: string, useCache = true): Promise<string | null> {
    // 先查缓存
    if (useCache) {
      const cached = this.valueCache.get(key);
      if (cached && Date.now() <= cached.expiresAt) {
        return cached.data;
      }
    }

    // 缓存未命中或禁用缓存，查数据库
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    const value = config?.value || null;

    // 写入缓存
    if (value !== null) {
      this.valueCache.set(key, this.setCache(value));
    }

    return value;
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

    // 清除相关缓存
    this.clearCacheKey(key);

    return config;
  }

  async delete(key: string): Promise<void> {
    await this.prisma.systemConfig.delete({
      where: { key },
    });

    // 清除缓存
    this.clearCacheKey(key);
  }

  // ==================== LLM 配置专用方法 ====================

  async getLLMConfig(useCache = true): Promise<LLMConfigDto> {
    // 先查缓存
    if (useCache) {
      const cached = this.getCached(this.llmConfigCache);
      if (cached) {
        return cached;
      }
    }

    // 并行查询所有 LLM 配置项
    const [
      provider,
      baseURL,
      apiKey,
      defaultModel,
      models,
    ] = await Promise.all([
      this.getValue('LLM_PROVIDER', false), // 禁用内层缓存，我们自己管理整体缓存
      this.getValue('LLM_BASE_URL', false),
      this.getValue('LLM_API_KEY', false),
      this.getValue('LLM_DEFAULT_MODEL', false),
      this.getValue('LLM_MODELS', false),
    ]);

    const config: LLMConfigDto = {
      provider: provider || 'stepfun',
      baseURL: baseURL || 'https://api.stepfun.com/v1',
      apiKey: apiKey || '',
      defaultModel: defaultModel || 'step-3.5-flash',
      models: models ? JSON.parse(models) : ['step-3.5-flash'],
    };

    // 写入缓存
    this.llmConfigCache = this.setCache(config);

    return config;
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

    // 保存完成后清除缓存，使新配置立即生效
    this.clearCache();
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