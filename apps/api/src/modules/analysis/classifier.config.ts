/**
 * 内容类型分类器配置
 * 可配置的规则引擎，支持关键词、URL模式、正则表达式匹配
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
  // URL域名到类型的映射
  domainMappings: Record<string, InfoType>;
  // 停用词列表（用于噪声检测）
  stopWords: string[];
}

// 默认配置
export const defaultClassifierConfig: ClassifierConfig = {
  version: '1.0.0',
  defaultType: 'analysis',
  minConfidence: 0.3,
  noiseThreshold: 0.15,
  
  // URL域名映射 - 高优先级
  domainMappings: {
    // 突发新闻源
    'reuters.com': 'breaking',
    'bloomberg.com': 'breaking',
    'cnbc.com': 'breaking',
    'ft.com': 'breaking',
    'wsj.com': 'breaking',
    'nytimes.com': 'breaking',
    'bbc.com': 'breaking',
    'xinhuanet.com': 'breaking',
    'people.com.cn': 'breaking',
    'sina.com.cn': 'breaking',
    'qq.com': 'breaking',
    
    // 学术/研究
    'arxiv.org': 'research',
    'scholar.google.com': 'research',
    'researchgate.net': 'research',
    'ieee.org': 'research',
    'acm.org': 'research',
    'nature.com': 'research',
    'science.org': 'research',
    'cell.com': 'research',
    'ssrn.com': 'research',
    'cnki.net': 'research',
    'wanfangdata.com.cn': 'research',
    
    // 数据报告
    'sec.gov': 'data',
    'stats.gov.cn': 'data',
    'worldbank.org': 'data',
    'imf.org': 'data',
    ' OECD.org': 'data',
    'fred.stlouisfed.org': 'data',
    'ourworldindata.org': 'data',
    'statista.com': 'data',
  },
  
  // 停用词（高频但低信息量的词）
  stopWords: [
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  ],
  
  // 各类型规则集
  typeRules: [
    // ========== 突发新闻 (breaking) ==========
    {
      infoType: 'breaking',
      baseScore: 0.1,
      threshold: 0.5,
      rules: [
        {
          name: 'breaking_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.4,
          patterns: [
            '突发', '快讯', '刚刚', '紧急', '速报', '突发新闻', 'breaking', 'urgent', 'just in',
            'news alert', '独家', '爆料', '首发', '现场', '直击', '第一时间',
          ],
          minMatches: 1,
        },
        {
          name: 'breaking_time_markers',
          type: 'keyword',
          target: 'title',
          weight: 0.3,
          patterns: [
            '今日', '今晨', '今晚', '凌晨', '早晨', '上午', '下午', '晚间',
            '第一时间', '刚刚发布', '实时', 'today', 'tonight', 'this morning',
          ],
          minMatches: 1,
        },
        {
          name: 'breaking_event_keywords',
          type: 'keyword',
          target: 'any',
          weight: 0.25,
          patterns: [
            '地震', '火灾', '爆炸', '事故', '冲突', '战争', '袭击', '伤亡', '死亡', '受伤',
            '发布会', '声明', '公告', '宣布', '签署', '达成', '通过', '批准', '地震', '台风',
            'earthquake', 'fire', 'explosion', 'accident', 'crash', 'attack', 'war',
            'announced', 'announces', 'launches', 'unveils', 'breakthrough',
          ],
          minMatches: 1,
        },
        {
          name: 'breaking_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.35,
          patterns: [
            '/news/', '/breaking/', '/latest/', '/live/', '/realtime/',
            '/article/', '/story/', '/watch/', '/live-updates/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 深度分析 (analysis) ==========
    {
      infoType: 'analysis',
      baseScore: 0.15,
      threshold: 0.45,
      rules: [
        {
          name: 'analysis_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.35,
          patterns: [
            '分析', '解读', '深度', '透视', '洞察', '观察', '思考', '复盘', '回顾',
            '展望', '预测', '研判', '剖析', '探究', '剖析', '梳理', '综述',
            'analysis', 'deep dive', 'insights', 'perspective', 'breakdown',
            'review', 'overview', 'explained', 'what\'s behind', 'the real story',
          ],
          minMatches: 1,
        },
        {
          name: 'analysis_content_markers',
          type: 'keyword',
          target: 'content',
          weight: 0.3,
          patterns: [
            '原因在于', '这意味着', '这表明', '背后', '本质', '逻辑', '趋势',
            '从...看', '一方面', '另一方面', '综上所述', '总体而言', '值得注意的是',
            'according to', 'data shows', 'research suggests', 'experts say',
            'indicates that', 'suggests that', 'implies', 'demonstrates',
          ],
          minMatches: 2,
        },
        {
          name: 'analysis_structure_markers',
          type: 'regex',
          target: 'content',
          weight: 0.25,
          patterns: [
            '第一[，、]', '第二[，、]', '第三[，、]', '首先[，、]', '其次[，、]', '最后[，、]',
            '[0-9]+[.、]', '[(（][0-9]+[)）]', '①|②|③|④|⑤',
          ],
          minMatches: 2,
        },
        {
          name: 'analysis_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.2,
          patterns: [
            '/analysis/', '/opinion/', '/commentary/', '/insight/', '/view/',
            '/perspective/', '/essay/', '/explained/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 学术/研究 (research) ==========
    {
      infoType: 'research',
      baseScore: 0.2,
      threshold: 0.5,
      rules: [
        {
          name: 'research_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.4,
          patterns: [
            '研究', '论文', '报告', '发现', '实验', '调查', '综述', 'meta分析',
            '研究表明', '研究揭示', '学术', '期刊', '发表', '文献', '引用',
            'study', 'research', 'paper', 'journal', 'findings', 'survey',
            'experiment', 'evidence', 'systematic review', 'meta-analysis',
          ],
          minMatches: 1,
        },
        {
          name: 'research_methodology_markers',
          type: 'keyword',
          target: 'content',
          weight: 0.35,
          patterns: [
            '方法', '样本', '数据', '统计', '显著性', '相关性', '回归分析',
            '实验组', '对照组', '假设', '验证', '结论', '局限性',
            'methodology', 'sample size', 'p-value', 'correlation', 'regression',
            'hypothesis', 'significant', 'confidence interval', 'limitations',
          ],
          minMatches: 2,
        },
        {
          name: 'research_citation_markers',
          type: 'regex',
          target: 'content',
          weight: 0.3,
          patterns: [
            '[(\[][0-9]{4}[)\]]',                    // (2023) [2023]
            'et al\.',                              // et al.
            'doi[:\s]',                            // DOI标记
            'https?://doi\.org/',                  // DOI链接
            '[(\[][^)\]]+[0-9]{4}[^)\]]*[)\]]',   // 作者年份引用
          ],
          minMatches: 1,
        },
        {
          name: 'research_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.25,
          patterns: [
            '/paper/', '/article/', '/research/', '/study/', '/publication/',
            '/journal/', '/pdf/', '/abstract/', '/full-text/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 评论/观点 (opinion) ==========
    {
      infoType: 'opinion',
      baseScore: 0.1,
      threshold: 0.4,
      rules: [
        {
          name: 'opinion_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.35,
          patterns: [
            '观点', '评论', '随笔', '感想', '思考', '看法', '杂谈', '漫谈',
            '我认为', '我觉得', '相信', '质疑', '反思', '批判',
            'opinion', 'commentary', 'editorial', 'think', 'believe', 'view',
            'my take', 'personal', 'reflection', 'thoughts on', 'why i',
          ],
          minMatches: 1,
        },
        {
          name: 'opinion_first_person',
          type: 'keyword',
          target: 'content',
          weight: 0.3,
          patterns: [
            '我认为', '我觉得', '我相信', '我质疑', '我想', '我感到',
            '在我看来', '依我之见', 'Personally', 'I think', 'I believe',
            'In my opinion', 'I feel', 'To me', 'From my perspective',
          ],
          minMatches: 2,
        },
        {
          name: 'opinion_emotional_markers',
          type: 'keyword',
          target: 'content',
          weight: 0.2,
          patterns: [
            '令人', '让人', '感到', '觉得', '震撼', '感动', '愤怒', '担忧',
            'exciting', 'concerning', 'worrying', 'impressive', 'disappointing',
            'amazing', 'shocking', 'frustrating',
          ],
          minMatches: 2,
        },
        {
          name: 'opinion_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.15,
          patterns: [
            '/opinion/', '/column/', '/blog/', '/thoughts/', '/essay/',
            '/commentary/', '/editorial/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 数据报告 (data) ==========
    {
      infoType: 'data',
      baseScore: 0.15,
      threshold: 0.45,
      rules: [
        {
          name: 'data_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.4,
          patterns: [
            '数据', '报告', '统计', '财报', '年报', '季报', '月报', '指数',
            '排名', '榜单', '趋势', '增长', '下降', '同比', '环比',
            'data', 'report', 'statistics', 'figures', 'numbers', 'index',
            'ranking', 'growth', 'decline', ' YoY', ' YoY ', ' MoM ', '%',
          ],
          minMatches: 1,
        },
        {
          name: 'data_number_markers',
          type: 'regex',
          target: 'content',
          weight: 0.35,
          patterns: [
            '[0-9]+[.,]?[0-9]*[%％]',              // 百分比
            '[0-9]+[.,]?[0-9]*[万亿]',            // 万亿单位
            '[0-9]{4}[年/-][0-9]{1,2}',          // 日期
            'Q[1-4]',                             // 季度
            '第[一二三四][季度]',                 // 中文季度
          ],
          minMatches: 3,
        },
        {
          name: 'data_chart_markers',
          type: 'keyword',
          target: 'content',
          weight: 0.25,
          patterns: [
            '图表', '图示', '折线图', '柱状图', '饼图', '表格',
            'figure', 'chart', 'graph', 'table', 'diagram', 'shown in',
          ],
          minMatches: 1,
        },
        {
          name: 'data_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.2,
          patterns: [
            '/data/', '/report/', '/statistics/', '/financial/', '/earnings/',
            '/quarterly/', '/annual-report/', '/dashboard/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 教程/指南 (tutorial) ==========
    {
      infoType: 'tutorial',
      baseScore: 0.1,
      threshold: 0.4,
      rules: [
        {
          name: 'tutorial_title_keywords',
          type: 'keyword',
          target: 'title',
          weight: 0.4,
          patterns: [
            '教程', '指南', '入门', '进阶', '实战', '详解', '手把手',
            '如何', '怎么', '步骤', '流程', '攻略', '秘诀', '技巧',
            'tutorial', 'guide', 'how to', 'step by step', 'getting started',
            'beginner', 'advanced', 'mastering', 'complete guide', 'walkthrough',
          ],
          minMatches: 1,
        },
        {
          name: 'tutorial_instruction_markers',
          type: 'keyword',
          target: 'content',
          weight: 0.35,
          patterns: [
            '第一步', '第二步', '首先', '然后', '接着', '最后', '完成',
            '打开', '点击', '选择', '输入', '保存', '设置', '配置',
            'step 1', 'step 2', 'first', 'then', 'next', 'finally',
            'open', 'click', 'select', 'enter', 'save', 'configure',
          ],
          minMatches: 3,
        },
        {
          name: 'tutorial_code_snippets',
          type: 'regex',
          target: 'content',
          weight: 0.25,
          patterns: [
            '```[a-z]*',                          // Markdown代码块
            '<code>',                             // HTML代码标签
            '[;；]$',                             // 行尾分号
            'function|class|const|let|var|def',  // 代码关键字
          ],
          minMatches: 2,
        },
        {
          name: 'tutorial_url_patterns',
          type: 'url',
          target: 'url',
          weight: 0.2,
          patterns: [
            '/tutorial/', '/guide/', '/how-to/', '/docs/', '/documentation/',
            '/learn/', '/course/', '/lesson/', '/example/',
          ],
          minMatches: 1,
        },
      ],
    },
    
    // ========== 噪声 (noise) ==========
    {
      infoType: 'noise',
      baseScore: 0,
      threshold: 0.35,
      rules: [
        {
          name: 'noise_clickbait_patterns',
          type: 'keyword',
          target: 'title',
          weight: 0.4,
          patterns: [
            '震惊', '不可思议', '颠覆认知', '99%的人', '必看', '绝了',
            '天啊', '轰动', '炸锅', '火爆', '疯了', '炸裂',
            'shocking', 'unbelievable', 'mind-blowing', 'you won\'t believe',
            'amazing', 'insane', 'crazy', 'viral',
          ],
          minMatches: 1,
        },
        {
          name: 'noise_short_content',
          type: 'regex',
          target: 'content',
          weight: 0.3,
          patterns: [
            '^.{0,50}$',                          // 少于50字符
          ],
          minMatches: 1,
        },
        {
          name: 'noise_promotional',
          type: 'keyword',
          target: 'any',
          weight: 0.3,
          patterns: [
            '限时', '优惠', '免费', '赠送', '点击领取', '立即购买',
            '广告', '推广', ' sponsored', 'limited time', 'free download',
            'click here', 'buy now', 'discount', 'promotion',
          ],
          minMatches: 2,
        },
        {
          name: 'noise_excessive_punctuation',
          type: 'regex',
          target: 'title',
          weight: 0.25,
          patterns: [
            '[！!]{2,}',                          // 多个感叹号
            '[？?]{2,}',                          // 多个问号
            '[.。]{3,}',                          // 多个句号
          ],
          minMatches: 1,
        },
      ],
    },
  ],
};
