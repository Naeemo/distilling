import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { VertexAiService } from './vertex-ai.service';
import { ArticleAnalysisService } from './article-analysis.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [ConfigModule, SystemConfigModule],
  providers: [AiService, VertexAiService, ArticleAnalysisService],
  controllers: [AiController],
  exports: [AiService, VertexAiService, ArticleAnalysisService],
})
export class AiModule {}