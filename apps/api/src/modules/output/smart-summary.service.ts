// ============================================================
// 智能摘要服务 (SmartSummaryService)
// 三级摘要系统：30秒阅读 / 2分钟阅读 / 深度阅读
// 支持多种叙事结构 + 自适应用户偏好
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import {
  SmartSummary,
  InsightLevel,
  SummaryLevelContent,
  NarrativeLevel,
  NarrativeSection,
  NarrativeStructure,
  PerspectiveSummary,
  Reference,
  SummaryOptions,
  SummaryPreview,
  SummaryQuality,
  SummaryLevel,
  DEFAULT_SUMMARY_OPTIONS,
  STRUCTURE_SELECTION_STRATEGY,
  READ_TIME_REFERENCE,
} from './smart-summary.types';
import {
  AggregatedStory,
  ThemeCluster,
  PerspectiveComparison,
  Perspective,
  TimelineEvent,
} from './content-aggregator.types';
import { CognitiveProfile, UserGoal, ExpertiseLevel } from './user-profile.types';

/**
 * 摘要生成上下文
 */
interface SummaryContext {
  story: AggregatedStory;
  profile?: CognitiveProfile;
  options: SummaryOptions;
  selectedStructure: NarrativeStructure;
}

/**
 * 内容分析结果
 */
interface ContentAnalysis {
  mainTheme: ThemeCluster;
  secondaryThemes: ThemeCluster[];
  hasConflict: boolean;
  hasTimeline: boolean;
  perspectiveCount: number;
  complexityScore: number;
  urgencyLevel: 'high' | 'medium' | 'low';
}

@Injectable()
export class SmartSummaryService {
  private readonly logger = new Logger(SmartSummaryService.name);

  /**
   * 生成智能摘要的主入口
   */
  async generate(
    userId: string,
    story: AggregatedStory,
    profile?: CognitiveProfile,
    options: Partial<SummaryOptions> = {},
  ): Promise<SmartSummary> {
    const opts = this.mergeOptions(options);
    this.logger.log(`开始生成智能摘要 for story ${story.id}, user ${userId}`);

    // 1. 分析内容特征
    const analysis = this.analyzeContent(story);

    // 2. 选择叙事结构
    const structure = this.selectStructure(analysis, profile, opts);

    // 3. 构建生成上下文
    const context: SummaryContext = {
      story,
      profile,
      options: opts,
      selectedStructure: structure,
    };

    // 4. 生成三级摘要
    const insight = opts.levels.insight 
      ? this.generateInsight(context, analysis)
      : this.createEmptyInsight();
    
    const summary = opts.levels.summary 
      ? this.generateSummary(context, analysis)
      : this.createEmptySummary();
    
    const narrative = opts.levels.narrative 
      ? this.generateNarrative(context, analysis)
      : this.createEmptyNarrative();

    // 5. 构建完整摘要对象
    const smartSummary: SmartSummary = {
      id: this.generateId(),
      userId,
      aggregatedStoryId: story.id,
      insight,
      summary,
      narrative,
      meta: {
        generatedAt: new Date(),
        version: 1,
        sourceCount: story.meta.sourceCount,
        themeCount: story.themes.length,
        totalReadTime: {
          insight: insight.readTime,
          summary: summary.readTime,
          narrative: narrative.estimatedReadTime,
        },
      },
      personalization: {
        targetProfile: profile?.expertise?.[0]?.domain || 'default',
        adaptationNotes: this.generateAdaptationNotes(context, analysis),
        difficultyLevel: this.determineDifficultyLevel(profile),
      },
    };

    this.logger.log(`智能摘要生成完成: ${smartSummary.id}`);
    return smartSummary;
  }

  /**
   * 生成摘要预览
   */
  async preview(
    story: AggregatedStory,
    profile?: CognitiveProfile,
  ): Promise<SummaryPreview> {
    const analysis = this.analyzeContent(story);
    const structure = this.selectStructure(analysis, profile, DEFAULT_SUMMARY_OPTIONS);
    
    // 根据用户画像推荐阅读级别
    const recommendedLevel = this.recommendLevel(profile, analysis);

    return {
      id: this.generateId(),
      title: story.title,
      availableLevels: [SummaryLevel.INSIGHT, SummaryLevel.SUMMARY, SummaryLevel.NARRATIVE],
      recommendedLevel,
      estimatedReadTimes: {
        insight: this.estimateReadTime('insight', story),
        summary: this.estimateReadTime('summary', story),
        narrative: this.estimateReadTime('narrative', story),
      },
      structureRecommendation: structure,
      keyThemes: story.themes.map(t => t.name).slice(0, 3),
      hasMultiplePerspectives: !!story.perspectives && story.perspectives.perspectives.length > 1,
      generatedAt: new Date(),
    };
  }

  /**
   * 评估摘要质量
   */
  async evaluateQuality(summary: SmartSummary, story: AggregatedStory): Promise<SummaryQuality> {
    const scores = {
      completeness: this.evaluateCompleteness(summary, story),
      accuracy: this.evaluateAccuracy(summary, story),
      coherence: this.evaluateCoherence(summary),
      conciseness: this.evaluateConciseness(summary),
      engagement: this.evaluateEngagement(summary),
    };

    const issues: string[] = [];
    const improvements: string[] = [];

    // 检查问题
    if (scores.completeness < 0.7) {
      issues.push('摘要未能覆盖所有重要主题');
      improvements.push('考虑增加更多主题的覆盖');
    }
    if (scores.coherence < 0.7) {
      issues.push('叙事连贯性有待提高');
      improvements.push('优化段落之间的过渡');
    }
    if (scores.conciseness < 0.6) {
      issues.push('摘要过于冗长');
      improvements.push('精简冗余信息');
    }

    return {
      summaryId: summary.id,
      scores,
      coverage: {
        themesCovered: this.countCoveredThemes(summary, story),
        themesTotal: story.themes.length,
        perspectivesCovered: summary.summary.perspectives?.length || 0,
        perspectivesTotal: story.perspectives?.perspectives.length || 0,
      },
      issues,
      improvements,
    };
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 分析内容特征
   */
  private analyzeContent(story: AggregatedStory): ContentAnalysis {
    // 找出主要主题 (内容最多的)
    const sortedThemes = [...story.themes].sort(
      (a, b) => b.contents.length - a.contents.length
    );
    
    const mainTheme = sortedThemes[0];
    const secondaryThemes = sortedThemes.slice(1, 3);
    
    // 检测是否有冲突观点
    const hasConflict = !!story.perspectives && 
      story.perspectives.keyDifferences.length > 0;
    
    // 检测是否有时间线
    const hasTimeline = !!story.timeline && story.timeline.events.length > 0;
    
    // 计算复杂度
    const complexityScore = this.calculateComplexity(story);
    
    // 评估紧急程度 (基于时效性和话题热度)
    const urgencyLevel = this.assessUrgency(story);

    return {
      mainTheme,
      secondaryThemes,
      hasConflict,
      hasTimeline,
      perspectiveCount: story.perspectives?.perspectives.length || 0,
      complexityScore,
      urgencyLevel,
    };
  }

  /**
   * 选择叙事结构
   */
  private selectStructure(
    analysis: ContentAnalysis,
    profile?: CognitiveProfile,
    options?: SummaryOptions,
  ): NarrativeStructure {
    // 如果用户指定了偏好结构，优先使用（但检查可用性）
    if (options?.preferredStructure) {
      // 对比结构需要至少2个观点
      if (options.preferredStructure === NarrativeStructure.COMPARE && analysis.perspectiveCount < 2) {
        return NarrativeStructure.ARC; // 退化为叙事弧线
      }
      return options.preferredStructure;
    }

    // 自动选择策略
    if (options?.autoStructure?.enabled) {
      const scores: Record<NarrativeStructure, number> = {
        [NarrativeStructure.PYRAMID]: 0,
        [NarrativeStructure.ARC]: 0,
        [NarrativeStructure.QA]: 0,
        [NarrativeStructure.COMPARE]: 0,
        [NarrativeStructure.CHRONOLOGY]: 0,
      };

      // 基于内容特征评分
      if (analysis.urgencyLevel === 'high') {
        scores[NarrativeStructure.PYRAMID] += 2;
      }
      if (analysis.hasConflict && analysis.perspectiveCount >= 2) {
        scores[NarrativeStructure.COMPARE] += 3;
      }
      if (analysis.hasTimeline) {
        scores[NarrativeStructure.CHRONOLOGY] += 2;
        scores[NarrativeStructure.ARC] += 1;
      }
      if (analysis.complexityScore > 0.7) {
        scores[NarrativeStructure.QA] += 2;
      }
      if (analysis.complexityScore > 0.4 && analysis.complexityScore <= 0.7) {
        scores[NarrativeStructure.ARC] += 2;
      }

      // 基于用户目标调整
      if (profile?.context?.goal === UserGoal.OVERVIEW) {
        scores[NarrativeStructure.PYRAMID] += 2;
      } else if (profile?.context?.goal === UserGoal.DECISION) {
        scores[NarrativeStructure.COMPARE] += 2;
      } else if (profile?.context?.goal === UserGoal.RESEARCH) {
        scores[NarrativeStructure.QA] += 2;
      }

      // 选择得分最高的
      return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as NarrativeStructure;
    }

    // 默认使用倒金字塔
    return NarrativeStructure.PYRAMID;
  }

  /**
   * 生成30秒阅读 - 核心洞察层
   */
  private generateInsight(context: SummaryContext, analysis: ContentAnalysis): InsightLevel {
    const { story, profile, options } = context;
    
    // 生成 headline (一句话概括)
    const headline = this.generateHeadline(story, analysis);
    
    // 生成核心观点
    const keyPoint = this.generateKeyPoint(story, analysis);
    
    // 生成用户影响
    const implication = this.generateImplication(story, analysis, profile);

    return {
      headline,
      keyPoint,
      implication,
      readTime: this.calculateInsightReadTime(headline, keyPoint, implication),
    };
  }

  /**
   * 生成2分钟阅读 - 扩展摘要层
   */
  private generateSummary(context: SummaryContext, analysis: ContentAnalysis): SummaryLevelContent {
    const { story, profile, options } = context;
    
    // 生成背景
    const context_str = this.generateContext(story, analysis, profile);
    
    // 生成关键发展
    const development = this.generateDevelopment(story, analysis);
    
    // 生成多视角摘要
    const perspectives = this.generatePerspectiveSummaries(story);
    
    // 提取关键要点
    const keyTakeaways = this.extractKeyTakeaways(story, analysis);

    return {
      context: context_str,
      development,
      perspectives,
      keyTakeaways,
      readTime: this.calculateSummaryReadTime(context_str, development, perspectives),
    };
  }

  /**
   * 生成深度阅读 - 叙事层
   */
  private generateNarrative(context: SummaryContext, analysis: ContentAnalysis): NarrativeLevel {
    const { story, selectedStructure } = context;
    
    let sections: NarrativeSection[] = [];

    // 根据选择的结构生成不同叙事
    switch (selectedStructure) {
      case NarrativeStructure.PYRAMID:
        sections = this.generatePyramidStructure(story, analysis);
        break;
      case NarrativeStructure.ARC:
        sections = this.generateArcStructure(story, analysis);
        break;
      case NarrativeStructure.QA:
        sections = this.generateQAStructure(story, analysis);
        break;
      case NarrativeStructure.COMPARE:
        sections = this.generateCompareStructure(story, analysis);
        break;
      case NarrativeStructure.CHRONOLOGY:
        sections = this.generateChronologyStructure(story, analysis);
        break;
      default:
        sections = this.generatePyramidStructure(story, analysis);
    }

    // 生成参考来源
    const references = this.generateReferences(story);

    return {
      structure: selectedStructure,
      sections,
      references,
      estimatedReadTime: this.estimateNarrativeReadTime(sections),
    };
  }

  // ============================================================
  // 叙事结构生成方法
  // ============================================================

  /**
   * 倒金字塔结构: 最重要→次要→背景
   */
  private generatePyramidStructure(story: AggregatedStory, analysis: ContentAnalysis): NarrativeSection[] {
    const sections: NarrativeSection[] = [];
    let order = 1;

    // L1: 核心洞察 (最重要)
    sections.push({
      order: order++,
      type: 'hook',
      title: '核心洞察',
      content: this.generateHeadline(story, analysis),
      highlights: [this.generateKeyPoint(story, analysis)],
    });

    // L2: 关键发展
    sections.push({
      order: order++,
      type: 'development',
      title: '关键发展',
      content: this.generateDevelopment(story, analysis),
    });

    // L3: 重要细节
    if (story.themes.length > 1) {
      const secondaryContent = story.themes.slice(1, 3)
        .map(t => `${t.name}: ${t.summary || t.description}`)
        .join('\n\n');
      sections.push({
        order: order++,
        type: 'analysis',
        title: '重要细节',
        content: secondaryContent,
      });
    }

    // L4: 背景信息
    sections.push({
      order: order++,
      type: 'context',
      title: '背景',
      content: this.generateContext(story, analysis),
    });

    return sections;
  }

  /**
   * 叙事弧线结构: 背景→冲突→高潮→解决
   */
  private generateArcStructure(story: AggregatedStory, analysis: ContentAnalysis): NarrativeSection[] {
    const sections: NarrativeSection[] = [];
    let order = 1;

    // 背景设定
    sections.push({
      order: order++,
      type: 'context',
      title: '背景',
      content: this.generateContext(story, analysis),
    });

    // 冲突/挑战
    const conflictContent = analysis.hasConflict && story.perspectives
      ? `这一话题引发了广泛争议：${story.perspectives.debateAreas.join('；')}`
      : '这一发展带来了新的机遇与挑战。';
    sections.push({
      order: order++,
      type: 'conflict',
      title: '争议与挑战',
      content: conflictContent,
    });

    // 高潮/转折点
    const climaxContent = story.timeline && story.timeline.events.length > 0
      ? `关键转折点：${story.timeline.events[story.timeline.events.length - 1].description}`
      : `核心突破：${this.generateKeyPoint(story, analysis)}`;
    sections.push({
      order: order++,
      type: 'climax',
      title: '关键转折',
      content: climaxContent,
    });

    // 多视角分析
    if (story.perspectives && story.perspectives.perspectives.length > 0) {
      const perspectivesContent = story.perspectives.perspectives
        .map(p => `${p.source.title}：${p.mainArgument}`)
        .join('\n\n');
      sections.push({
        order: order++,
        type: 'analysis',
        title: '不同视角',
        content: perspectivesContent,
      });
    }

    // 结论/展望
    sections.push({
      order: order++,
      type: 'resolution',
      title: '结论与展望',
      content: this.generateImplication(story, analysis),
    });

    return sections;
  }

  /**
   * 问答式结构
   */
  private generateQAStructure(story: AggregatedStory, analysis: ContentAnalysis): NarrativeSection[] {
    const sections: NarrativeSection[] = [];
    let order = 1;

    // 生成关键问题
    const questions = this.generateQuestions(story, analysis);

    for (const q of questions) {
      sections.push({
        order: order++,
        type: 'question',
        title: `Q: ${q.question}`,
        content: q.question,
      });
      sections.push({
        order: order++,
        type: 'answer',
        title: '答案',
        content: q.answer,
      });
    }

    return sections;
  }

  /**
   * 对比式结构
   */
  private generateCompareStructure(story: AggregatedStory, analysis: ContentAnalysis): NarrativeSection[] {
    const sections: NarrativeSection[] = [];
    let order = 1;

    if (!story.perspectives || story.perspectives.perspectives.length < 2) {
      // 如果只有一个观点，退化为弧线结构
      return this.generateArcStructure(story, analysis);
    }

    const perspectives = story.perspectives.perspectives.slice(0, 2);

    // 对比主题
    sections.push({
      order: order++,
      type: 'context',
      title: '争议焦点',
      content: story.perspectives.topic,
    });

    // 观点A
    sections.push({
      order: order++,
      type: 'comparison_a',
      title: `观点：${perspectives[0].source.title}`,
      content: perspectives[0].mainArgument,
      keyQuotes: perspectives[0].keyClaims,
    });

    // 观点B
    sections.push({
      order: order++,
      type: 'comparison_b',
      title: `观点：${perspectives[1].source.title}`,
      content: perspectives[1].mainArgument,
      keyQuotes: perspectives[1].keyClaims,
    });

    // 关键差异
    const differencesContent = story.perspectives.keyDifferences
      .map(d => `${d.aspect}：${d.descriptions.map(desc => desc.description).join(' vs ')}`)
      .join('\n\n');
    sections.push({
      order: order++,
      type: 'analysis',
      title: '关键差异',
      content: differencesContent,
    });

    // 共识点
    if (story.perspectives.consensusAreas.length > 0) {
      sections.push({
        order: order++,
        type: 'synthesis',
        title: '共识点',
        content: story.perspectives.consensusAreas.join('；'),
      });
    }

    return sections;
  }

  /**
   * 时间线结构
   */
  private generateChronologyStructure(story: AggregatedStory, analysis: ContentAnalysis): NarrativeSection[] {
    const sections: NarrativeSection[] = [];
    let order = 1;

    // 背景
    sections.push({
      order: order++,
      type: 'context',
      title: '背景',
      content: this.generateContext(story, analysis),
    });

    // 时间线事件
    if (story.timeline && story.timeline.events.length > 0) {
      const sortedEvents = [...story.timeline.events]
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
        .slice(0, 5); // 最多显示5个事件

      for (const event of sortedEvents) {
        sections.push({
          order: order++,
          type: 'development',
          title: `${event.eventDate.toLocaleDateString('zh-CN')} - ${event.title}`,
          content: event.description,
          keyQuotes: [event.sourceContext],
        });
      }
    }

    // 现状与展望
    sections.push({
      order: order++,
      type: 'conclusion',
      title: '现状与展望',
      content: this.generateImplication(story, analysis),
    });

    return sections;
  }

  // ============================================================
  // 内容生成辅助方法
  // ============================================================

  /**
   * 生成 Headline (一句话概括)
   */
  private generateHeadline(story: AggregatedStory, analysis: ContentAnalysis): string {
    const mainTheme = analysis.mainTheme;
    const themeName = mainTheme.name;
    const contentCount = story.meta.sourceCount;
    
    // 根据是否有冲突调整 headline
    if (analysis.hasConflict) {
      return `${themeName}引发分歧：多方观点碰撞，核心争议在于${story.perspectives?.debateAreas[0] || '未来发展走向'}`;
    }
    
    // 根据紧急程度调整
    if (analysis.urgencyLevel === 'high') {
      return `【重要】${themeName}出现重大进展：${mainTheme.summary || mainTheme.description.slice(0, 50)}`;
    }
    
    return `关于${themeName}的${contentCount}篇内容分析：${mainTheme.summary || mainTheme.description.slice(0, 50)}`;
  }

  /**
   * 生成核心观点
   */
  private generateKeyPoint(story: AggregatedStory, analysis: ContentAnalysis): string {
    const mainTheme = analysis.mainTheme;
    
    // 从主要内容中提取关键信息
    const keyContents = mainTheme.contents.slice(0, 2);
    const combinedPoints = keyContents
      .flatMap(c => c.keyPoints.slice(0, 2))
      .join('；');
    
    return combinedPoints || mainTheme.summary || mainTheme.description;
  }

  /**
   * 生成用户影响
   */
  private generateImplication(
    story: AggregatedStory, 
    analysis: ContentAnalysis,
    profile?: CognitiveProfile,
  ): string {
    // 根据用户领域定制影响说明
    const domain = profile?.expertise?.[0]?.domain || 'general';
    
    const implications: Record<string, string> = {
      tech: '这一发展可能影响技术栈选择和架构决策，建议持续关注后续进展。',
      finance: '这一信息可能对市场预期产生影响，建议评估相关投资组合风险。',
      science: '这一发现可能推动相关领域的研究进展，值得关注其学术影响。',
      general: '这一信息值得了解，可能与您关注的领域相关。',
    };
    
    return implications[domain] || implications.general;
  }

  /**
   * 生成背景
   */
  private generateContext(
    story: AggregatedStory, 
    analysis: ContentAnalysis,
    profile?: CognitiveProfile,
  ): string {
    const mainTheme = analysis.mainTheme;
    const dateRange = story.meta.dateRange;
    const daysSpan = Math.ceil(
      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let context = `这一话题在过去${daysSpan}天内受到${story.meta.sourceCount}个来源的关注。`;
    context += `主要聚焦于${mainTheme.name}`;
    
    if (analysis.secondaryThemes.length > 0) {
      context += `，同时涉及${analysis.secondaryThemes.map(t => t.name).join('、')}等相关议题`;
    }
    
    context += '。';
    
    // 根据用户级别调整详细程度
    if (profile?.expertise?.[0]?.level !== ExpertiseLevel.NOVICE) {
      context += `内容可信度评分为${Math.round(story.meta.confidenceScore * 100)}%。`;
    }
    
    return context;
  }

  /**
   * 生成关键发展
   */
  private generateDevelopment(story: AggregatedStory, analysis: ContentAnalysis): string {
    const mainTheme = analysis.mainTheme;
    const contents = mainTheme.contents.slice(0, 3);
    
    const developments = contents.map(c => {
      const keyPoint = c.keyPoints[0] || c.excerpt.slice(0, 100);
      return `• ${c.title}：${keyPoint}`;
    });
    
    return developments.join('\n');
  }

  /**
   * 生成视角摘要
   */
  private generatePerspectiveSummaries(story: AggregatedStory): PerspectiveSummary[] {
    if (!story.perspectives) {
      return [];
    }
    
    return story.perspectives.perspectives.slice(0, 3).map(p => ({
      stance: p.stance,
      source: p.source.title,
      mainPoint: p.mainArgument.slice(0, 150),
      evidenceStrength: p.evidence.length > 2 ? 'strong' : p.evidence.length > 0 ? 'moderate' : 'weak',
    }));
  }

  /**
   * 提取关键要点
   */
  private extractKeyTakeaways(story: AggregatedStory, analysis: ContentAnalysis): string[] {
    const takeaways: string[] = [];
    
    // 从主要主题提取
    analysis.mainTheme.contents.slice(0, 2).forEach(c => {
      takeaways.push(...c.keyPoints.slice(0, 2));
    });
    
    // 如果有观点对比，添加关键差异
    if (story.perspectives && story.perspectives.keyDifferences.length > 0) {
      takeaways.push(`争议焦点：${story.perspectives.keyDifferences[0].aspect}`);
    }
    
    // 从可信度评估提取
    const highCredibility = story.credibilityMap
      .filter(c => c.overallScore > 0.8)
      .length;
    if (highCredibility > 0) {
      takeaways.push(`${highCredibility}个高可信度来源支持主要观点`);
    }
    
    return takeaways.slice(0, 5); // 最多5个要点
  }

  /**
   * 生成问答对
   */
  private generateQuestions(story: AggregatedStory, analysis: ContentAnalysis): Array<{question: string; answer: string}> {
    const questions: Array<{question: string; answer: string}> = [];
    
    // Q1: 这是什么？
    questions.push({
      question: `什么是${analysis.mainTheme.name}？`,
      answer: analysis.mainTheme.summary || analysis.mainTheme.description,
    });
    
    // Q2: 为什么重要？
    questions.push({
      question: '为什么这个话题值得关注？',
      answer: this.generateImplication(story, analysis),
    });
    
    // Q3: 不同观点是什么？
    if (story.perspectives && story.perspectives.perspectives.length > 0) {
      const stanceSummary = story.perspectives.perspectives
        .map(p => `${p.source.title}持${p.stance === 'supportive' ? '支持' : p.stance === 'critical' ? '批评' : '中立'}态度`)
        .join('，');
      questions.push({
        question: '各方持什么观点？',
        answer: stanceSummary,
      });
    }
    
    return questions;
  }

  /**
   * 生成参考来源
   */
  private generateReferences(story: AggregatedStory): Reference[] {
    return story.credibilityMap.map(c => ({
      id: this.generateId(),
      contentId: c.contentId,
      title: c.contentId, // 简化处理，实际应从内容获取标题
      credibilityScore: c.overallScore,
      relevanceScore: 0.8, // 简化处理
    }));
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 合并选项
   */
  private mergeOptions(options: Partial<SummaryOptions>): SummaryOptions {
    return {
      ...DEFAULT_SUMMARY_OPTIONS,
      ...options,
      levels: { ...DEFAULT_SUMMARY_OPTIONS.levels, ...options.levels },
      content: { ...DEFAULT_SUMMARY_OPTIONS.content, ...options.content },
      personalization: { ...DEFAULT_SUMMARY_OPTIONS.personalization, ...options.personalization },
      autoStructure: { ...DEFAULT_SUMMARY_OPTIONS.autoStructure, ...options.autoStructure },
    };
  }

  /**
   * 计算内容复杂度
   */
  private calculateComplexity(story: AggregatedStory): number {
    let complexity = 0.5;
    
    // 基于主题数量
    complexity += story.themes.length * 0.05;
    
    // 基于观点数量
    if (story.perspectives) {
      complexity += story.perspectives.perspectives.length * 0.05;
    }
    
    // 基于来源数量
    complexity += story.meta.sourceCount * 0.02;
    
    return Math.min(complexity, 1);
  }

  /**
   * 评估紧急程度
   */
  private assessUrgency(story: AggregatedStory): 'high' | 'medium' | 'low' {
    const daysSinceLatest = Math.ceil(
      (new Date().getTime() - new Date(story.meta.dateRange.end).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLatest <= 1) return 'high';
    if (daysSinceLatest <= 7) return 'medium';
    return 'low';
  }

  /**
   * 推荐阅读级别
   */
  private recommendLevel(profile: CognitiveProfile | undefined, analysis: ContentAnalysis): SummaryLevel {
    if (!profile) return SummaryLevel.SUMMARY;
    
    // 根据可用时间
    if (profile.context?.availableTime && profile.context.availableTime < 1) {
      return SummaryLevel.INSIGHT;
    }
    
    // 根据目标
    if (profile.context?.goal === UserGoal.OVERVIEW) {
      return SummaryLevel.INSIGHT;
    }
    if (profile.context?.goal === UserGoal.RESEARCH) {
      return SummaryLevel.NARRATIVE;
    }
    
    // 根据复杂度
    if (analysis.complexityScore > 0.7) {
      return SummaryLevel.NARRATIVE;
    }
    
    return SummaryLevel.SUMMARY;
  }

  /**
   * 确定难度级别
   */
  private determineDifficultyLevel(profile?: CognitiveProfile): 'beginner' | 'intermediate' | 'advanced' {
    if (!profile || !profile.expertise || profile.expertise.length === 0) return 'intermediate';
    
    // 取第一个领域的级别作为主要参考
    const primaryExpertise = profile.expertise[0];
    switch (primaryExpertise.level) {
      case ExpertiseLevel.NOVICE: return 'beginner';
      case ExpertiseLevel.EXPERT: return 'advanced';
      default: return 'intermediate';
    }
  }

  /**
   * 生成适配说明
   */
  private generateAdaptationNotes(context: SummaryContext, analysis: ContentAnalysis): string[] {
    const notes: string[] = [];
    const { profile, selectedStructure } = context;
    
    notes.push(`自动选择叙事结构: ${selectedStructure}`);
    
    if (profile?.expertise?.[0]?.level) {
      notes.push(`根据用户${profile.expertise[0].level}级别调整难度`);
    }
    
    if (analysis.hasConflict) {
      notes.push('检测到多方观点，已包含对比分析');
    }
    
    return notes;
  }

  /**
   * 计算阅读时间
   */
  private calculateInsightReadTime(headline: string, keyPoint: string, implication: string): number {
    const totalChars = headline.length + keyPoint.length + implication.length;
    // 中文平均阅读速度约300字/分钟 = 5字/秒
    return Math.max(READ_TIME_REFERENCE.insight.min, 
      Math.min(READ_TIME_REFERENCE.insight.max, Math.round(totalChars / 5)));
  }

  private calculateSummaryReadTime(context: string, development: string, perspectives: PerspectiveSummary[]): number {
    let totalChars = context.length + development.length;
    perspectives.forEach(p => {
      totalChars += p.mainPoint.length;
    });
    return Math.max(READ_TIME_REFERENCE.summary.min,
      Math.min(READ_TIME_REFERENCE.summary.max, Math.round(totalChars / 5)));
  }

  private estimateNarrativeReadTime(sections: NarrativeSection[]): number {
    const totalChars = sections.reduce((sum, s) => sum + s.content.length, 0);
    return Math.max(READ_TIME_REFERENCE.narrative.min,
      Math.min(READ_TIME_REFERENCE.narrative.max, Math.round(totalChars / 300)));
  }

  private estimateReadTime(level: 'insight' | 'summary' | 'narrative', story: AggregatedStory): number {
    switch (level) {
      case 'insight': return READ_TIME_REFERENCE.insight.target;
      case 'summary': return READ_TIME_REFERENCE.summary.target;
      case 'narrative': 
        const estimated = Math.round(story.meta.sourceCount * 2);
        return Math.min(READ_TIME_REFERENCE.narrative.max, estimated);
      default: return 0;
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================
  // 空对象生成方法 (当某级别被禁用时)
  // ============================================================

  private createEmptyInsight(): InsightLevel {
    return {
      headline: '',
      keyPoint: '',
      implication: '',
      readTime: 0,
    };
  }

  private createEmptySummary(): SummaryLevelContent {
    return {
      context: '',
      development: '',
      perspectives: [],
      keyTakeaways: [],
      readTime: 0,
    };
  }

  private createEmptyNarrative(): NarrativeLevel {
    return {
      structure: NarrativeStructure.PYRAMID,
      sections: [],
      references: [],
      estimatedReadTime: 0,
    };
  }

  // ============================================================
  // 质量评估方法
  // ============================================================

  private evaluateCompleteness(summary: SmartSummary, story: AggregatedStory): number {
    let score = 0.5;
    
    // 检查主题覆盖
    const coveredThemes = summary.narrative.sections.filter(s => 
      story.themes.some(t => s.content.includes(t.name))
    ).length;
    score += (coveredThemes / story.themes.length) * 0.3;
    
    // 检查观点覆盖
    if (story.perspectives && summary.summary.perspectives) {
      const coveredPerspectives = summary.summary.perspectives.length;
      score += (coveredPerspectives / story.perspectives.perspectives.length) * 0.2;
    }
    
    return Math.min(1, score);
  }

  private evaluateAccuracy(summary: SmartSummary, story: AggregatedStory): number {
    // 基于来源可信度
    const avgCredibility = story.credibilityMap.reduce((sum, c) => sum + c.overallScore, 0) 
      / story.credibilityMap.length;
    return avgCredibility;
  }

  private evaluateCoherence(summary: SmartSummary): number {
    // 检查段落数量
    const sectionCount = summary.narrative.sections.length;
    if (sectionCount >= 3 && sectionCount <= 8) return 0.9;
    if (sectionCount > 0) return 0.7;
    return 0.5;
  }

  private evaluateConciseness(summary: SmartSummary): number {
    // 检查阅读时间是否在目标范围内
    const insightTime = summary.insight.readTime;
    const summaryTime = summary.summary.readTime;
    
    const insightOk = insightTime >= READ_TIME_REFERENCE.insight.min && 
      insightTime <= READ_TIME_REFERENCE.insight.max;
    const summaryOk = summaryTime >= READ_TIME_REFERENCE.summary.min && 
      summaryTime <= READ_TIME_REFERENCE.summary.max;
    
    if (insightOk && summaryOk) return 0.9;
    if (insightOk || summaryOk) return 0.7;
    return 0.5;
  }

  private evaluateEngagement(summary: SmartSummary): number {
    // 检查 headline 质量
    const headline = summary.insight.headline;
    let score = 0.5;
    
    if (headline.length > 20 && headline.length < 100) score += 0.2;
    if (headline.includes('：') || headline.includes('，')) score += 0.1;
    if (summary.narrative.sections.some(s => s.keyQuotes && s.keyQuotes.length > 0)) score += 0.2;
    
    return Math.min(1, score);
  }

  private countCoveredThemes(summary: SmartSummary, story: AggregatedStory): number {
    return story.themes.filter(t => 
      summary.narrative.sections.some(s => s.content.includes(t.name))
    ).length;
  }
}
