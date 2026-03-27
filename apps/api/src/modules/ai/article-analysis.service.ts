import { Injectable } from '@nestjs/common';
import { VertexAiService } from './vertex-ai.service';

export interface ArticleAnalysisResult {
  qualityRating: 'A' | 'B' | 'C' | 'D';
  articleType: string;
  summary: {
    question?: string;
    claim?: string;
    keyReasons: string[];
  };
  logicalAnalysis: {
    fallaciesDetected: Array<{
      type: string;
      excerpt: string;
      explanation: string;
    }>;
    evidenceAssessment: string;
    logicalSoundness: number; // 0-10
  };
  credibility: {
    sourceScore: number; // 0-10
    biasIndicators: string[];
    verificationStatus: string;
  };
  recommendation: {
    action: string;
    timeInvestment: string;
    noteTaking: string;
  };
  keyTakeaways: string[];
}

@Injectable()
export class ArticleAnalysisService {
  constructor(private vertexAi: VertexAiService) {}

  /**
   * 分析文章质量
   */
  async analyzeArticle(title: string, content: string): Promise<ArticleAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(title, content);
    
    const response = await this.vertexAi.chatCompletion([
      { role: 'system', content: this.getSystemPrompt() },
      { role: 'user', content: prompt }
    ], {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
    });

    return this.parseAnalysisResponse(response);
  }

  /**
   * 构建分析提示词
   */
  private buildAnalysisPrompt(title: string, content: string): string {
    return `
请对以下文章进行深度分析，严格按照知萃分析方法论执行。

【文章标题】
${title}

【文章内容】
${content.substring(0, 8000)}

请按以下JSON格式输出分析结果：

{
  "qualityRating": "A/B/C/D",
  "articleType": "资讯报道/观点评论/知识科普/科研论文/营销软文/情绪宣泄",
  "summary": {
    "question": "作者试图回答的核心问题",
    "claim": "作者的核心观点",
    "keyReasons": ["支持理由1", "支持理由2"]
  },
  "logicalAnalysis": {
    "fallaciesDetected": [
      {
        "type": "谬误类型",
        "excerpt": "原文片段",
        "explanation": "为什么是谬误"
      }
    ],
    "evidenceAssessment": "证据强度评价",
    "logicalSoundness": 7
  },
  "credibility": {
    "sourceScore": 7,
    "biasIndicators": ["偏见指标1", "偏见指标2"],
    "verificationStatus": "可验证/部分可验证/不可验证"
  },
  "recommendation": {
    "action": "精读/速读/提取要点/丢弃",
    "timeInvestment": "建议阅读时间",
    "noteTaking": "笔记建议"
  },
  "keyTakeaways": ["核心收获1", "核心收获2"]
}

评分标准：
- A级：逻辑严密+证据充分+观点新颖（精读）
- B级：逻辑基本通顺，但有瑕疵（提取核心观点）
- C级：逻辑问题多，或证据薄弱（仅提取关键信息）
- D级：明显谬误/营销软文/情绪文（丢弃）
`;
  }

  /**
   * 系统提示词
   */
  private getSystemPrompt(): string {
    return `你是知萃(InfoDigest)的文章分析专家，精通逻辑学、新闻学和心理学。

你的任务是用批判性思维分析文章，识别：
1. 文章类型和质量等级
2. 核心论点和论据
3. 逻辑谬误和证据问题
4. 信源可信度和偏见
5. 给出阅读建议

分析原则：
- 客观理性，不受情绪影响
- 区分事实与观点
- 检验证据质量
- 识别逻辑谬误
- 评估信息价值

常见逻辑谬误：人身攻击、诉诸权威、稻草人、虚假因果、以偏概全、滑坡谬误、非黑即白、循环论证等。

输出必须严格按JSON格式，不要添加任何markdown标记或额外说明。`;
  }

  /**
   * 解析分析结果
   */
  private parseAnalysisResponse(response: string): ArticleAnalysisResult {
    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          qualityRating: parsed.qualityRating || 'C',
          articleType: parsed.articleType || '未知类型',
          summary: {
            question: parsed.summary?.question,
            claim: parsed.summary?.claim,
            keyReasons: parsed.summary?.keyReasons || [],
          },
          logicalAnalysis: {
            fallaciesDetected: parsed.logicalAnalysis?.fallaciesDetected || [],
            evidenceAssessment: parsed.logicalAnalysis?.evidenceAssessment || '未评估',
            logicalSoundness: parsed.logicalAnalysis?.logicalSoundness || 5,
          },
          credibility: {
            sourceScore: parsed.credibility?.sourceScore || 5,
            biasIndicators: parsed.credibility?.biasIndicators || [],
            verificationStatus: parsed.credibility?.verificationStatus || '未评估',
          },
          recommendation: {
            action: parsed.recommendation?.action || '速读',
            timeInvestment: parsed.recommendation?.timeInvestment || '5分钟',
            noteTaking: parsed.recommendation?.noteTaking || '简单记录',
          },
          keyTakeaways: parsed.keyTakeaways || [],
        };
      }
    } catch (error) {
      console.error('解析分析结果失败:', error);
    }

    // 返回默认结果
    return this.getDefaultAnalysis();
  }

  /**
   * 获取默认分析结果
   */
  private getDefaultAnalysis(): ArticleAnalysisResult {
    return {
      qualityRating: 'C',
      articleType: '未分类',
      summary: {
        keyReasons: [],
      },
      logicalAnalysis: {
        fallaciesDetected: [],
        evidenceAssessment: '无法评估',
        logicalSoundness: 5,
      },
      credibility: {
        sourceScore: 5,
        biasIndicators: [],
        verificationStatus: '未评估',
      },
      recommendation: {
        action: '速读',
        timeInvestment: '5分钟',
        noteTaking: '简单记录',
      },
      keyTakeaways: [],
    };
  }

  /**
   * 生成快速质量评分（用于列表页）
   */
  async quickQualityScore(title: string, excerpt?: string): Promise<{
    score: 'A' | 'B' | 'C' | 'D';
    reason: string;
  }> {
    const prompt = `快速评估这篇文章质量，只返回评级和简短原因。

标题：${title}
摘要：${excerpt || '无'}

按以下格式返回：
评级: A/B/C/D
原因: 一句话说明

评级标准：
- A: 深度干货，值得精读
- B: 有价值，但需筛选
- C: 一般，快速浏览即可
- D: 水文/营销/情绪，建议跳过`;

    const response = await this.vertexAi.chatCompletion([
      { role: 'system', content: '你是文章质量评估专家，快速给出评级。' },
      { role: 'user', content: prompt }
    ], {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
    });

    const lines = response.split('\n');
    const scoreLine = lines.find(l => l.includes('评级:'));
    const reasonLine = lines.find(l => l.includes('原因:'));

    return {
      score: (scoreLine?.match(/[ABCD]/)?.[0] as 'A' | 'B' | 'C' | 'D') || 'C',
      reason: reasonLine?.replace('原因:', '').trim() || '未提供原因',
    };
  }
}
