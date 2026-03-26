import { Injectable, Logger } from '@nestjs/common';
import {
  SignificanceInput,
  SignificanceResult,
  SignificanceLevel,
  DimensionScores,
  SignificanceScorerConfig,
  SignificanceWeights,
  DomainReputation,
  UserProfile,
  ContentMetadata,
} from './significance.types';
import { defaultSignificanceScorerConfig } from './significance.config';

/**
 * 重要性评估器服务
 * 
 * 多维度评分算法：
 * - 信源权威性 (30%): 基于域名信誉库
 * - 信息新颖性 (25%): 与用户已有知识对比
 * - 用户相关性 (30%): 基于兴趣标签匹配
 * - 时效性 (15%): 时间衰减因子
 */
@Injectable()
export class SignificanceScorer {
  private readonly logger = new Logger(SignificanceScorer.name);
  private config: SignificanceScorerConfig;

  constructor(config?: Partial<SignificanceScorerConfig>) {
    this.config = this.mergeConfig(config);
  }

  /**
   * 合并自定义配置与默认配置
   */
  private mergeConfig(customConfig?: Partial<SignificanceScorerConfig>): SignificanceScorerConfig {
    return {
      ...defaultSignificanceScorerConfig,
      ...customConfig,
      weights: {
        ...defaultSignificanceScorerConfig.weights,
        ...customConfig?.weights,
      },
      thresholds: {
        ...defaultSignificanceScorerConfig.thresholds,
        ...customConfig?.thresholds,
      },
      domainReputations: {
        ...defaultSignificanceScorerConfig.domainReputations,
        ...customConfig?.domainReputations,
      },
      timelinessConfig: {
        ...defaultSignificanceScorerConfig.timelinessConfig,
        ...customConfig?.timelinessConfig,
      },
      noveltyConfig: {
        ...defaultSignificanceScorerConfig.noveltyConfig,
        ...customConfig?.noveltyConfig,
      },
    };
  }

  /**
   * 更新评分器配置
   */
  updateConfig(config: Partial<SignificanceScorerConfig>): void {
    this.config = this.mergeConfig(config);
    this.logger.log('SignificanceScorer configuration updated');
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignificanceScorerConfig {
    return { ...this.config };
  }

  /**
   * 主评分方法
   * @param input 评分输入（内容、元数据、用户画像）
   * @returns 重要性评分结果
   */
  score(input: SignificanceInput): SignificanceResult {
    const { content, metadata, userProfile } = input;

    // 1. 信源权威性评分
    const domainScore = this.scoreDomainAuthority(metadata.sourceDomain, userProfile);

    // 如果被屏蔽，直接返回低分
    if (domainScore.score === 0) {
      return {
        score: 0,
        level: 'low',
        dimensionScores: {
          domainAuthority: 0,
          novelty: 0,
          relevance: 0,
          timeliness: 0,
        },
        breakdown: {
          domainAuthority: {
            score: 0,
            details: domainScore.details,
          },
          novelty: {
            score: 0,
            details: ['域名被屏蔽，跳过评分'],
          },
          relevance: {
            score: 0,
            details: ['域名被屏蔽，跳过评分'],
          },
          timeliness: {
            score: 0,
            details: ['域名被屏蔽，跳过评分'],
          },
        },
        recommendations: ['该来源在用户屏蔽列表中，建议忽略'],
      };
    }

    // 2. 信息新颖性评分
    const noveltyScore = this.scoreNovelty(content, metadata, userProfile);

    // 3. 用户相关性评分
    const relevanceScore = this.scoreRelevance(content, metadata, userProfile);

    // 4. 时效性评分
    const timelinessScore = this.scoreTimeliness(metadata);

    // 5. 计算综合得分
    const dimensionScores: DimensionScores = {
      domainAuthority: domainScore.score,
      novelty: noveltyScore.score,
      relevance: relevanceScore.score,
      timeliness: timelinessScore.score,
    };

    const finalScore = this.calculateFinalScore(dimensionScores);
    const level = this.determineLevel(finalScore);

    return {
      score: Math.round(finalScore * 100) / 100,
      level,
      dimensionScores,
      breakdown: {
        domainAuthority: {
          score: domainScore.score,
          details: domainScore.details,
        },
        novelty: {
          score: noveltyScore.score,
          details: noveltyScore.details,
        },
        relevance: {
          score: relevanceScore.score,
          details: relevanceScore.details,
        },
        timeliness: {
          score: timelinessScore.score,
          details: timelinessScore.details,
        },
      },
      recommendations: this.generateRecommendations(dimensionScores, level),
    };
  }

  /**
   * 批量评分
   */
  scoreBatch(inputs: SignificanceInput[]): SignificanceResult[] {
    return inputs.map(input => this.score(input));
  }

  /**
   * 信源权威性评分
   * 基于域名信誉库，同时考虑用户偏好和屏蔽列表
   */
  private scoreDomainAuthority(
    domain: string,
    userProfile: UserProfile,
  ): { score: number; details: string[] } {
    const details: string[] = [];
    let score = 0.5; // 默认中等分数

    // 标准化域名
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    // 检查用户屏蔽列表
    if (userProfile.blockedDomains?.some(d => 
      normalizedDomain === d.toLowerCase() || normalizedDomain.endsWith(`.${d.toLowerCase()}`)
    )) {
      details.push(`域名 ${domain} 在用户屏蔽列表中`);
      return { score: 0, details };
    }

    // 从信誉库获取评分
    let reputation: DomainReputation | undefined;
    
    // 精确匹配
    if (this.config.domainReputations[normalizedDomain]) {
      reputation = this.config.domainReputations[normalizedDomain];
    } else {
      // 尝试匹配父域名
      const parts = normalizedDomain.split('.');
      for (let i = 1; i < parts.length; i++) {
        const parentDomain = parts.slice(i).join('.');
        if (this.config.domainReputations[parentDomain]) {
          reputation = this.config.domainReputations[parentDomain];
          break;
        }
      }
    }

    if (reputation) {
      score = reputation.score;
      details.push(`域名 ${domain} 信誉等级: ${reputation.category} (${reputation.score})`);
      if (reputation.description) {
        details.push(`描述: ${reputation.description}`);
      }
    } else {
      details.push(`域名 ${domain} 不在信誉库中，使用默认分数`);
    }

    // 检查用户偏好域名（加分）
    if (userProfile.preferredDomains?.some(d => 
      normalizedDomain === d.toLowerCase() || normalizedDomain.endsWith(`.${d.toLowerCase()}`)
    )) {
      score = Math.min(score + 0.1, 1.0);
      details.push('用户偏好域名，加分 +0.1');
    }

    return { score: Math.round(score * 100) / 100, details };
  }

  /**
   * 信息新颖性评分
   * 基于与用户阅读历史的相似度
   */
  private scoreNovelty(
    content: { title: string; text: string; summary?: string },
    metadata: ContentMetadata,
    userProfile: UserProfile,
  ): { score: number; details: string[] } {
    const details: string[] = [];

    // 无阅读历史，默认为高新颖性
    if (!userProfile.readingHistory || userProfile.readingHistory.length === 0) {
      details.push('无阅读历史，默认为高新颖性');
      return { score: 1.0, details };
    }

    const history = userProfile.readingHistory;
    const currentTags = metadata.tags || [];
    const currentTitle = content.title.toLowerCase();

    let maxSimilarity = 0;
    let similarContentCount = 0;

    // 计算与阅读历史的相似度
    for (const item of history) {
      // 标签重叠度
      const itemTags = item.tags || [];
      const tagOverlap = currentTags.filter(tag => 
        itemTags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
      const tagSimilarity = currentTags.length > 0 
        ? tagOverlap.length / Math.max(currentTags.length, itemTags.length)
        : 0;

      // 标题相似度（简单匹配）
      const titleWords = currentTitle.split(/\s+/);
      const itemTitleWords = item.title.toLowerCase().split(/\s+/);
      const commonWords = titleWords.filter(w => 
        w.length > 2 && itemTitleWords.includes(w)
      );
      const titleSimilarity = titleWords.length > 0 
        ? commonWords.length / titleWords.length
        : 0;

      // 综合相似度
      const similarity = tagSimilarity * 0.6 + titleSimilarity * 0.4;

      if (similarity > this.config.noveltyConfig.minSimilarityThreshold) {
        similarContentCount++;
      }
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // 计算新颖性分数（相似度越低，新颖性越高）
    let score = 1 - maxSimilarity;

    // 如果有大量相似内容，进一步降低分数
    if (similarContentCount > 2) {
      score *= Math.max(0.5, 1 - (similarContentCount - 2) * 0.1);
      details.push(`发现 ${similarContentCount} 篇相似历史内容`);
    }

    details.push(`与历史内容最大相似度: ${Math.round(maxSimilarity * 100)}%`);
    details.push(`新颖性评分: ${Math.round(score * 100)}%`);

    return { score: Math.round(Math.max(0, score) * 100) / 100, details };
  }

  /**
   * 用户相关性评分
   * 基于兴趣标签匹配
   */
  private scoreRelevance(
    content: { title: string; text: string; summary?: string },
    metadata: ContentMetadata,
    userProfile: UserProfile,
  ): { score: number; details: string[] } {
    const details: string[] = [];

    // 无兴趣标签，使用内容类型匹配
    if (!userProfile.interestTags || userProfile.interestTags.length === 0) {
      details.push('无用户兴趣标签，使用默认相关性');
      return { score: 0.5, details };
    }

    const contentTags = metadata.tags || [];
    const contentText = (content.title + ' ' + content.text).toLowerCase();
    const userTags = userProfile.interestTags.map(t => t.toLowerCase());

    let matchCount = 0;
    let matchedTags: string[] = [];

    // 检查标签直接匹配
    for (const userTag of userTags) {
      // 标签直接匹配
      if (contentTags.some(t => t.toLowerCase() === userTag)) {
        matchCount++;
        matchedTags.push(userTag);
      } 
      // 文本内容匹配
      else if (contentText.includes(userTag)) {
        matchCount += 0.5;
        matchedTags.push(`${userTag}(文本)`);
      }
    }

    // 计算相关性分数
    const baseScore = Math.min(matchCount / Math.max(userTags.length * 0.3, 1), 1);
    
    // 内容类型匹配加分
    let typeBonus = 0;
    const contentType = metadata.contentType.toLowerCase();
    if (userTags.some(t => contentType.includes(t) || t.includes(contentType))) {
      typeBonus = 0.1;
      details.push(`内容类型 "${metadata.contentType}" 匹配兴趣标签`);
    }

    const score = Math.min(baseScore + typeBonus, 1);

    if (matchedTags.length > 0) {
      details.push(`匹配兴趣标签: ${matchedTags.join(', ')}`);
    }
    details.push(`相关性评分: ${Math.round(score * 100)}%`);

    return { score: Math.round(score * 100) / 100, details };
  }

  /**
   * 时效性评分
   * 基于时间衰减因子
   */
  private scoreTimeliness(
    metadata: ContentMetadata,
  ): { score: number; details: string[] } {
    const details: string[] = [];

    // 无发布日期，默认为中等时效性
    if (!metadata.publishDate) {
      details.push('无发布日期，使用默认时效性');
      return { score: 0.5, details };
    }

    const now = new Date();
    const publishDate = new Date(metadata.publishDate);
    const ageHours = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);

    // 检查是否超过最大有效期
    if (ageHours > this.config.timelinessConfig.maxAgeHours) {
      details.push(`内容已过期 (${Math.round(ageHours / 24)}天 > ${Math.round(this.config.timelinessConfig.maxAgeHours / 24)}天)`);
      return { score: 0, details };
    }

    // 获取该类型内容的半衰期
    const halfLife = this.config.timelinessConfig.halfLifeHours[metadata.contentType] 
      || this.config.timelinessConfig.halfLifeHours.default;

    // 指数衰减计算
    // score = exp(-ageHours * ln(2) / halfLife)
    const decay = Math.exp(-ageHours * Math.LN2 / halfLife);
    
    // 突发新闻特殊处理：超过24小时大幅降低分数
    let score = decay;
    if (metadata.contentType === 'breaking' && ageHours > 24) {
      score *= 0.5;
      details.push('突发新闻超过24小时');
    }

    details.push(`发布时间: ${publishDate.toISOString()}`);
    details.push(`内容年龄: ${Math.round(ageHours)}小时`);
    details.push(`半衰期: ${halfLife}小时`);
    details.push(`时效性评分: ${Math.round(score * 100)}%`);

    return { score: Math.round(score * 100) / 100, details };
  }

  /**
   * 计算综合得分
   */
  private calculateFinalScore(dimensions: DimensionScores): number {
    const { weights } = this.config;
    
    // 加权平均
    const weightedScore = 
      dimensions.domainAuthority * weights.domainAuthority +
      dimensions.novelty * weights.novelty +
      dimensions.relevance * weights.relevance +
      dimensions.timeliness * weights.timeliness;

    return weightedScore;
  }

  /**
   * 确定重要性等级
   */
  private determineLevel(score: number): SignificanceLevel {
    const { thresholds } = this.config;
    
    if (score >= thresholds.high) {
      return 'high';
    } else if (score >= thresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(
    dimensions: DimensionScores,
    level: SignificanceLevel,
  ): string[] {
    const recommendations: string[] = [];

    if (level === 'low') {
      if (dimensions.domainAuthority < 0.5) {
        recommendations.push('考虑从更权威的来源获取信息');
      }
      if (dimensions.novelty < 0.5) {
        recommendations.push('该内容可能与已有知识重复');
      }
      if (dimensions.relevance < 0.5) {
        recommendations.push('与用户兴趣相关性较低');
      }
      if (dimensions.timeliness < 0.5) {
        recommendations.push('内容时效性较差，可能已过时');
      }
    } else if (level === 'medium') {
      recommendations.push('可以考虑进一步阅读');
    } else {
      recommendations.push('高重要性内容，建议优先阅读');
    }

    return recommendations;
  }

  /**
   * 更新权重配置
   */
  updateWeights(weights: Partial<SignificanceWeights>): void {
    const newWeights = {
      ...this.config.weights,
      ...weights,
    };

    // 自动归一化权重，使总和为1
    const sum = newWeights.domainAuthority + newWeights.novelty + newWeights.relevance + newWeights.timeliness;
    if (sum !== 1) {
      const factor = 1 / sum;
      newWeights.domainAuthority *= factor;
      newWeights.novelty *= factor;
      newWeights.relevance *= factor;
      newWeights.timeliness *= factor;
    }

    this.config.weights = newWeights;
    this.logger.log('Significance weights updated', this.config.weights);
  }

  /**
   * 获取当前权重
   */
  getWeights(): SignificanceWeights {
    return { ...this.config.weights };
  }

  /**
   * 添加域名信誉
   */
  addDomainReputation(domain: string, reputation: DomainReputation): void {
    this.config.domainReputations[domain.toLowerCase()] = reputation;
    this.logger.log(`Domain reputation added: ${domain}`);
  }

  /**
   * 移除域名信誉
   */
  removeDomainReputation(domain: string): void {
    delete this.config.domainReputations[domain.toLowerCase()];
    this.logger.log(`Domain reputation removed: ${domain}`);
  }

  /**
   * 获取域名信誉
   */
  getDomainReputation(domain: string): DomainReputation | undefined {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
    return this.config.domainReputations[normalizedDomain];
  }
}
