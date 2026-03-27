import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { VertexAiService } from './vertex-ai.service';
import { ArticleAnalysisService } from './article-analysis.service';

@Module({
  imports: [ConfigModule],
  providers: [AiService, VertexAiService, ArticleAnalysisService],
  controllers: [AiController],
  exports: [AiService, ArticleAnalysisService],
})
export class AiModule {}
