import { Injectable, Logger } from '@nestjs/common';
import {
  ClassificationInput,
  ClassificationResult,
  InfoType,
  ClassifierConfig,
  MatchRule,
  TypeRuleSet,
} from './classifier.types';
import { defaultClassifierConfig } from './classifier.config';

/**
 * 内容类型分类器服务
 * 
 * 基于规则+关键词+URL模式的混合分类引擎
 * 支持可配置的分类规则，可动态调整分类策略
 */
@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);
  private config: ClassifierConfig;

  constructor(config?: Partial<ClassifierConfig>) {
    this.config = this.mergeConfig(config);
  }

  /**
   * 合并自定义配置与默认配置
   */
  private mergeConfig(customConfig?: Partial<ClassifierConfig>): ClassifierConfig {
    return {
      ...defaultClassifierConfig,
      ...customConfig,
      domainMappings: {
        ...defaultClassifierConfig.domainMappings,
        ...customConfig?.domainMappings,
      },
      typeRules: customConfig?.typeRules || defaultClassifierConfig.typeRules,
      stopWords: customConfig?.stopWords || defaultClassifierConfig.stopWords,
    };
  }

  /**
   * 更新分类器配置
   */
  updateConfig(config: Partial<ClassifierConfig>): void {
    this.config = this.mergeConfig(config);
    this.logger.log('Classifier configuration updated');
  }

  /**
   * 获取当前配置
   */
  getConfig(): ClassifierConfig {
    return { ...this.config };
  }

  /**
   * 主分类方法
   * @param input 分类输入（标题、首段、URL）
   * @returns 分类结果
   */
  classify(input: ClassificationInput): ClassificationResult {
    const { title, firstParagraph, url } = input;
    
    // 1. 首先检查URL域名映射（最高优先级）
    const domainResult = this.classifyByDomain(url);
    if (domainResult) {
      return {
        infoType: domainResult.type,
        confidence: domainResult.confidence,
        matchedRules: ['domain_mapping'],
        scores: { [domainResult.type]: domainResult.confidence } as Record<InfoType, number>,
      };
    }

    // 2. 基于规则计算各类型得分
    const { scores, matchedRules } = this.calculateScores(title, firstParagraph, url);
    
    // 3. 确定最终类型
    const { infoType, confidence } = this.determineType(scores, matchedRules);

    return {
      infoType,
      confidence,
      matchedRules,
      scores,
    };
  }

  /**
   * 批量分类
   */
  classifyBatch(inputs: ClassificationInput[]): ClassificationResult[] {
    return inputs.map(input => this.classify(input));
  }

  /**
   * 基于URL域名分类
   */
  private classifyByDomain(url: string): { type: InfoType; confidence: number } | null {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      // 直接匹配
      if (this.config.domainMappings[hostname]) {
        return { type: this.config.domainMappings[hostname], confidence: 0.85 };
      }

      // 去掉www前缀后匹配
      const domain = hostname.replace(/^www\./, '');
      if (this.config.domainMappings[domain]) {
        return { type: this.config.domainMappings[domain], confidence: 0.85 };
      }

      // 匹配顶级域名
      for (const [mappedDomain, type] of Object.entries(this.config.domainMappings)) {
        if (hostname.endsWith(mappedDomain)) {
          return { type, confidence: 0.85 };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * 计算所有类型的得分
   */
  private calculateScores(
    title: string,
    content: string,
    url: string,
  ): { scores: Record<InfoType, number>; matchedRules: string[] } {
    const scores: Partial<Record<InfoType, number>> = {};
    const matchedRules: string[] = [];

    for (const ruleSet of this.config.typeRules) {
      const { score, rules } = this.calculateTypeScore(ruleSet, title, content, url);
      scores[ruleSet.infoType] = score;
      matchedRules.push(...rules);
    }

    return { scores: scores as Record<InfoType, number>, matchedRules };
  }

  /**
   * 计算单个类型的得分
   */
  private calculateTypeScore(
    ruleSet: TypeRuleSet,
    title: string,
    content: string,
    url: string,
  ): { score: number; rules: string[] } {
    let totalScore = ruleSet.baseScore;
    const matchedRules: string[] = [];

    for (const rule of ruleSet.rules) {
      const matchCount = this.applyRule(rule, title, content, url);
      
      if (matchCount >= (rule.minMatches || 1)) {
        matchedRules.push(rule.name);
        // 得分 = 权重 * (匹配次数的衰减加成)
        const bonus = Math.min(matchCount * 0.1, 0.3); // 最多30%额外加成
        totalScore += rule.weight * (1 + bonus);
      }
    }

    // 归一化到 0-1
    return { score: Math.min(totalScore, 1), rules: matchedRules };
  }

  /**
   * 应用单条规则，返回匹配次数
   */
  private applyRule(
    rule: MatchRule,
    title: string,
    content: string,
    url: string,
  ): number {
    let matchCount = 0;
    const flags = rule.caseSensitive ? '' : 'i';

    // 确定目标文本
    let targets: string[] = [];
    switch (rule.target) {
      case 'title':
        targets = [title];
        break;
      case 'content':
        targets = [content];
        break;
      case 'url':
        targets = [url];
        break;
      case 'any':
        targets = [title, content, url];
        break;
    }

    for (const pattern of rule.patterns) {
      for (const target of targets) {
        if (!target) continue;

        switch (rule.type) {
          case 'keyword':
            if (this.matchKeyword(pattern, target, rule.caseSensitive)) {
              matchCount++;
            }
            break;
          case 'regex':
            if (this.matchRegex(pattern, target, flags)) {
              matchCount++;
            }
            break;
          case 'url':
            if (target.includes(pattern)) {
              matchCount++;
            }
            break;
        }
      }
    }

    return matchCount;
  }

  /**
   * 关键词匹配
   */
  private matchKeyword(pattern: string, text: string, caseSensitive?: boolean): boolean {
    if (caseSensitive) {
      return text.includes(pattern);
    }
    return text.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * 正则匹配
   */
  private matchRegex(pattern: string, text: string, flags: string): boolean {
    try {
      const regex = new RegExp(pattern, flags);
      return regex.test(text);
    } catch {
      this.logger.warn(`Invalid regex pattern: ${pattern}`);
      return false;
    }
  }

  /**
   * 确定最终分类类型
   */
  private determineType(
    scores: Record<InfoType, number>,
    matchedRules: string[],
  ): { infoType: InfoType; confidence: number } {
    // 按得分排序
    const sorted = Object.entries(scores)
      .map(([type, score]) => ({ type: type as InfoType, score }))
      .sort((a, b) => b.score - a.score);

    const top = sorted[0];
    const runnerUp = sorted[1];

    // 计算置信度：基于得分差距和绝对得分
    let confidence = top.score;
    if (runnerUp) {
      // 差距越大，置信度越高
      const gap = top.score - runnerUp.score;
      confidence = Math.min(top.score + gap * 0.5, 1);
    }

    // 检查是否达到阈值
    const typeRule = this.config.typeRules.find(r => r.infoType === top.type);
    const threshold = typeRule?.threshold || 0.5;

    // 如果最高分未达到阈值，使用默认类型
    if (top.score < threshold && top.score < this.config.minConfidence) {
      return {
        infoType: this.config.defaultType,
        confidence: 1 - top.score, // 低分意味着对默认类型的置信度
      };
    }

    // 噪声特殊处理：如果噪声得分最高且超过阈值，直接标记为噪声
    if (top.type === 'noise' && top.score >= this.config.noiseThreshold) {
      return {
        infoType: 'noise',
        confidence,
      };
    }

    return {
      infoType: top.type,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * 计算文本信息熵（用于噪声检测的高级功能）
   * @param text 输入文本
   * @returns 信息熵值
   */
  calculateEntropy(text: string): number {
    if (!text || text.length === 0) return 0;

    // 字符频率统计
    const charCount: Record<string, number> = {};
    for (const char of text) {
      charCount[char] = (charCount[char] || 0) + 1;
    }

    const len = text.length;
    let entropy = 0;

    for (const count of Object.values(charCount)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * 检测低信息熵内容（噪声）
   * @param text 输入文本
   * @returns 是否为噪声
   */
  isLowEntropy(text: string): boolean {
    const entropy = this.calculateEntropy(text);
    // 中文文本的正常熵值一般在 3-5 之间，低于 2 可能是重复内容或乱码
    return entropy < 2;
  }

  /**
   * 获取所有支持的信息类型
   */
  getSupportedTypes(): InfoType[] {
    return this.config.typeRules.map(r => r.infoType);
  }

  /**
   * 添加自定义域名映射
   */
  addDomainMapping(domain: string, infoType: InfoType): void {
    this.config.domainMappings[domain.toLowerCase()] = infoType;
  }

  /**
   * 移除域名映射
   */
  removeDomainMapping(domain: string): void {
    delete this.config.domainMappings[domain.toLowerCase()];
  }
}
