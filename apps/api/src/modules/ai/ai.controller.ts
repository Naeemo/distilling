import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';
import { ArticleAnalysisService } from './article-analysis.service';
import { SummarizeDto, AnalyzeArticleDto } from './dto';

@ApiTags('AI')
@Controller('api/v1/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly articleAnalysisService: ArticleAnalysisService,
  ) {}

  @Post('summarize')
  @ApiOperation({ summary: '生成摘要（流式）' })
  async summarize(
    @Request() req,
    @Body() dto: SummarizeDto,
    @Res() res: Response,
  ) {
    // 设置SSE头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const chunks: string[] = [];

    try {
      const result = await this.aiService.generateSummary(
        dto.contentId,
        dto.type,
        (chunk) => {
          chunks.push(chunk);
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
      );

      // 发送最终结果
      res.write(`data: ${JSON.stringify({
        summaryId: result.summaryId,
        summaryText: result.summaryText,
        tokensUsed: result.tokensUsed,
      })}\n\n`);

      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  @Get('contents/:id/summaries')
  @ApiOperation({ summary: '获取摘要历史' })
  async getSummaries(@Request() req, @Param('id') id: string) {
    return this.aiService.getSummaries(id);
  }

  @Post('analyze')
  @ApiOperation({ summary: '分析文章质量（知萃方法论）' })
  async analyzeArticle(@Request() req, @Body() dto: AnalyzeArticleDto) {
    const result = await this.articleAnalysisService.analyzeArticle(
      dto.title,
      dto.content,
    );
    return {
      success: true,
      data: result,
    };
  }

  @Post('analyze/quick')
  @ApiOperation({ summary: '快速质量评分' })
  async quickAnalyze(@Request() req, @Body() dto: { title: string; excerpt?: string }) {
    const result = await this.articleAnalysisService.quickQualityScore(
      dto.title,
      dto.excerpt,
    );
    return {
      success: true,
      data: result,
    };
  }
}
