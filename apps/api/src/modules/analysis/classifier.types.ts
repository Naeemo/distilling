/**
 * 内容分类器类型定义
 */

export type InfoType = 
  | 'breaking'      // 突发新闻
  | 'analysis'      // 深度分析
  | 'research'      // 学术/研究报告
  | 'opinion'       // 评论/随笔
  | 'data'          // 数据报告/财报
  | 'tutorial'      // 教程/指南
  | 'noise';        // 低信息熵内容

export interface ClassificationResult {
  infoType: InfoType;
  confidence: number;      // 置信度 0-1
  matchedRules: string[];  // 匹配到的规则名称
  scores: Record<InfoType, number>; // 各类型得分
}

export interface ClassificationInput {
  title: string;
  firstParagraph: string;
  url: string;
}

// 匹配规则接口
export interface MatchRule {
  name: string;
  weight: number;          // 规则权重
  type: 'keyword' | 'url' | 'regex' | 'composite';
  target: 'title' | 'content' | 'url' | 'any';
  patterns: string[];      // 匹配模式
  caseSensitive?: boolean; // 是否区分大小写
  minMatches?: number;     // 最少匹配数
}

// 类型规则集
export interface TypeRuleSet {
  infoType: InfoType;
  baseScore: number;       // 基础分数
  rules: MatchRule[];
  threshold: number;       // 分类阈值
}

// 分类器配置
export interface ClassifierConfig {
  version: string;
  defaultType: InfoType;
  minConfidence: number;   // 最小置信度
  noiseThreshold: number;  // 噪声检测阈值
  typeRules: TypeRuleSet[];
  domainMappings: Record<string, InfoType>;
  stopWords: string[];
}
