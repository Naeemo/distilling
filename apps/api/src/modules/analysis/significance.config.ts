/**
 * 重要性评估器默认配置
 */

import { SignificanceScorerConfig, DomainReputation } from './significance.types';

// 权威域名信誉库
export const defaultDomainReputations: Record<string, DomainReputation> = {
  // 学术/研究机构
  'arxiv.org': { score: 0.95, category: 'authoritative', description: '预印本论文库' },
  'pubmed.ncbi.nlm.nih.gov': { score: 0.95, category: 'authoritative', description: '医学文献数据库' },
  'nature.com': { score: 0.95, category: 'authoritative', description: 'Nature期刊' },
  'science.org': { score: 0.95, category: 'authoritative', description: 'Science期刊' },
  'ieee.org': { score: 0.92, category: 'authoritative', description: 'IEEE学术组织' },
  'acm.org': { score: 0.92, category: 'authoritative', description: 'ACM学术组织' },
  'mit.edu': { score: 0.90, category: 'authoritative', description: '麻省理工' },
  'stanford.edu': { score: 0.90, category: 'authoritative', description: '斯坦福大学' },
  'harvard.edu': { score: 0.90, category: 'authoritative', description: '哈佛大学' },
  
  // 权威媒体
  'reuters.com': { score: 0.90, category: 'authoritative', description: '路透社' },
  'bloomberg.com': { score: 0.90, category: 'authoritative', description: '彭博社' },
  'ft.com': { score: 0.88, category: 'authoritative', description: '金融时报' },
  'economist.com': { score: 0.88, category: 'authoritative', description: '经济学人' },
  'nytimes.com': { score: 0.85, category: 'reputable', description: '纽约时报' },
  'wsj.com': { score: 0.88, category: 'reputable', description: '华尔街日报' },
  'bbc.com': { score: 0.85, category: 'reputable', description: 'BBC' },
  'theguardian.com': { score: 0.82, category: 'reputable', description: '卫报' },
  
  // 科技媒体
  'techcrunch.com': { score: 0.75, category: 'reputable', description: 'TechCrunch' },
  'theverge.com': { score: 0.75, category: 'reputable', description: 'The Verge' },
  'wired.com': { score: 0.80, category: 'reputable', description: 'Wired' },
  'arstechnica.com': { score: 0.78, category: 'reputable', description: 'Ars Technica' },
  'github.com': { score: 0.85, category: 'reputable', description: 'GitHub' },
  
  // 中文权威媒体
  'xinhuanet.com': { score: 0.82, category: 'authoritative', description: '新华网' },
  'people.com.cn': { score: 0.82, category: 'authoritative', description: '人民网' },
  'caixin.com': { score: 0.85, category: 'authoritative', description: '财新网' },
  'yicai.com': { score: 0.80, category: 'reputable', description: '第一财经' },
  '36kr.com': { score: 0.72, category: 'reputable', description: '36氪' },
  
  // 可疑/低质量域名
  'clickbait.com': { score: 0.10, category: 'suspicious', description: '标题党网站' },
  'fake-news.xyz': { score: 0.05, category: 'blocked', description: '虚假新闻' },
};

// 默认权重配置
export const defaultSignificanceScorerConfig: SignificanceScorerConfig = {
  version: '1.0.0',
  weights: {
    domainAuthority: 0.30,  // 信源权威性 30%
    novelty: 0.25,          // 信息新颖性 25%
    relevance: 0.30,        // 用户相关性 30%
    timeliness: 0.15,       // 时效性 15%
  },
  thresholds: {
    high: 0.70,     // ≥0.7 为 high
    medium: 0.40,   // ≥0.4 为 medium
    low: 0.0,       // <0.4 为 low
  },
  domainReputations: defaultDomainReputations,
  timelinessConfig: {
    halfLifeHours: {
      breaking: 6,      // 突发新闻：6小时半衰期
      analysis: 168,    // 深度分析：7天半衰期
      research: 720,    // 学术研究：30天半衰期
      opinion: 72,      // 观点评论：3天半衰期
      data: 168,        // 数据报告：7天半衰期
      tutorial: 2160,   // 教程：90天半衰期
      noise: 1,         // 噪声：1小时
      default: 72,      // 默认：3天
    },
    maxAgeHours: 2160,  // 最大有效期90天
  },
  noveltyConfig: {
    minSimilarityThreshold: 0.3,  // 相似度≥0.3视为重复内容
    tagOverlapPenalty: 0.2,       // 每重叠一个标签扣0.2分
  },
};
