import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigDto, UpdateSystemConfigDto, CreateSystemConfigDto, LLMConfigDto } from './dto';

interface SWRCacheEntry<T> {
  data: T;
  updatedAt: number;
  isRevalidating: boolean;
}

@Injectable()
export class SystemConfigService {
  // SWR 缓存：数据 + 元数据
  private valueCache = new Map<string, SWRCacheEntry<string>>();
  private llmConfigCache: SWRCacheEntry<LLMConfigDto> | null = null;
  
  // SWR 参数
  private readonly STALE_TIME = 5 * 60 * 1000;      // 5分钟内视为新鲜，直接返回
  private readonly MAX_STALE_TIME = 30 * 60 * 1000; // 30分钟后强制刷新

  constructor(private prisma: PrismaService) {}

  // ==================== SWR 缓存核心 ====================

  /**
   * SWR 读取：先返回缓存，后台静默刷新
   */
  private async swrRead<T>(
    cacheKey: string | null,
    cacheStore: Map<string, SWRCacheEntry<T>> | null,
    fetcher: () => Promise<T>,
    options: { force?: boolean } = {}
  ): Promise<T> {
    const now = Date.now();
    
    // 获取当前缓存
    let entry: SWRCacheEntry<T> | null = null;
    if (cacheKey && cacheStore) {
      entry = cacheStore.get(cacheKey) || null;
    } else if (!cacheKey) {
      entry = (this.llmConfigCache as SWRCacheEntry<T>) || null;
    }

    const isForceRefresh = options.force;
    const isStale = entry ? (now - entry.updatedAt) > this.STALE_TIME : true;
    const isExpired = entry ? (now - entry.updatedAt) > this.MAX_STALE_TIME : true;

    // 1. 缓存不存在或已过期：必须等待新数据
    if (!entry || isExpired || isForceRefresh) {
      const data = await fetcher();
      const newEntry = { data, updatedAt: now, isRevalidating: false };
      
      if (cacheKey && cacheStore) {
        cacheStore.set(cacheKey, newEntry);
      } else if (!cacheKey) {
        this.llmConfigCache = newEntry as SWRCacheEntry<LLMConfigDto>;
      }
      
      return data;
    }

    // 2. 缓存存在但可能已陈旧：返回缓存，后台刷新
    if (isStale && !entry.isRevalidating) {
      entry.isRevalidating = true;
      // 后台静默刷新（不 await）
      this.backgroundRevalidate(cacheKey, cacheStore, fetcher, entry);
    }

    // 立即返回当前缓存（可能是陈旧的，但可用）
    return entry.data;
  }

  /**
   * 后台静默刷新
   */
  private async backgroundRevalidate<T>(
    cacheKey: string | null,
    cacheStore: Map<string, SWRCacheEntry<T>> | null,
    fetcher: () => Promise<T>,
    currentEntry: SWRCacheEntry<T>
  ): Promise<void> {
    try {
      const data = await fetcher();
      const newEntry = { data, updatedAt: Date.now(), isRevalidating: false };
      
      if (cacheKey && cacheStore) {
        cacheStore.set(cacheKey, newEntry);
      } else if (!cacheKey) {
        this.llmConfigCache = newEntry as SWRCacheEntry<LLMConfigDto>;
      }
    } catch (error) {
      console.error('SWR background revalidate failed:', error);
      currentEntry.isRevalidating = false;
    }
  }

  /**
   * 乐观更新：立即更新缓存
   */
  private optimisticUpdate<T>(
    cacheKey: string | null,
    cacheStore: Map<string, SWRCacheEntry<T>> | null,
    data: T
  ): void {
    const entry = { data, updatedAt: Date.now(), isRevalidating: false };
    
    if (cacheKey && cacheStore) {
      cacheStore.set(cacheKey, entry);
    } else if (!cacheKey) {
      this.llmConfigCache = entry as SWRCacheEntry<LLMConfigDto>;
    }
  }

  /**
   * 清除缓存（配置变更时调用）
   */
  clearCache(key?: string): void {
    if (key) {
      this.valueCache.delete(key);
      if (key.startsWith('LLM_')) {
        this.llmConfigCache = null;
      }
    } else {
      this.valueCache.clear();
      this.llmConfigCache = null;
    }
  }

  // ==================== 通用配置操作 ====================

  async findAll(category?: string): Promise<SystemConfigDto[]> {
    const configs = await this.prisma.systemConfig.findMany({
      where: category ? { category } : undefined,
      orderBy: { category: 'asc', key: 'asc' },
    });

    return configs.map(config => ({
      ...config,
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

  async getValue(key: string, options?: { force?: boolean }): Promise<string | null> {
    return this.swrRead(
      key,
      this.valueCache,
      async () => {
        const config = await this.prisma.systemConfig.findUnique({
          where: { key },
        });
        return config?.value || null;
      },
      options
    );
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

    // 乐观更新缓存
    this.optimisticUpdate(data.key, this.valueCache, config.value);

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

    // 乐观更新缓存
    if (data.value !== undefined) {
      this.optimisticUpdate(key, this.valueCache, data.value);
    }
    // LLM 配置变更时清除聚合缓存
    if (key.startsWith('LLM_')) {
      this.llmConfigCache = null;
    }

    return config;
  }

  async delete(key: string): Promise<void> {
    await this.prisma.systemConfig.delete({
      where: { key },
    });

    // 清除缓存
    this.clearCache(key);
  }

  // ==================== LLM 配置专用方法 ====================

  async getLLMConfig(options?: { force?: boolean }): Promise<LLMConfigDto> {
    return this.swrRead(
      null, // LLM 配置使用独立的 llmConfigCache
      null,
      async () => {
        const [
          provider,
          baseURL,
          apiKey,
          defaultModel,
          models,
        ] = await Promise.all([
          this.getValue('LLM_PROVIDER', { force: true }), // 强制刷新底层缓存
          this.getValue('LLM_BASE_URL', { force: true }),
          this.getValue('LLM_API_KEY', { force: true }),
          this.getValue('LLM_DEFAULT_MODEL', { force: true }),
          this.getValue('LLM_MODELS', { force: true }),
        ]);

        return {
          provider: provider || 'stepfun',
          baseURL: baseURL || 'https://api.stepfun.com/v1',
          apiKey: apiKey || '',
          defaultModel: defaultModel || 'step-3.5-flash',
          models: models ? JSON.parse(models) : ['step-3.5-flash'],
        };
      },
      options
    );
  }

  async saveLLMConfig(config: LLMConfigDto, userId: string): Promise<void> {
    const configs = [
      { key: 'LLM_PROVIDER', value: config.provider, isSecret: false },
      { key: 'LLM_BASE_URL', value: config.baseURL, isSecret: false },
      { key: 'LLM_API_KEY', value: config.apiKey, isSecret: true },
      { key: 'LLM_DEFAULT_MODEL', value: config.defaultModel, isSecret: false },
      { key: 'LLM_MODELS', value: JSON.stringify(config.models), isSecret: false },
    ];

    // 乐观更新：先更新缓存
    this.optimisticUpdate(null, null, config);

    // 然后写入数据库
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