import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { StepfunService } from './stepfun.service';
import { ArticleAnalysisService } from './article-analysis.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [ConfigModule, SystemConfigModule],
  providers: [AiService, StepfunService, ArticleAnalysisService],
  controllers: [AiController],
  exports: [AiService, StepfunService, ArticleAnalysisService],
})
export class AiModule {}
