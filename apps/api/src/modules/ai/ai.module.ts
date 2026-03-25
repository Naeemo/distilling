import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { StepfunService } from './stepfun.service';
import { ArticleAnalysisService } from './article-analysis.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, StepfunService, ArticleAnalysisService],
  controllers: [AiController],
  exports: [AiService, ArticleAnalysisService],
})
export class AiModule {}
