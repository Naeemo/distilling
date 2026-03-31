import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ContentModule } from './modules/content/content.module';
import { AiModule } from './modules/ai/ai.module';
import { HighlightModule } from './modules/highlight/highlight.module';
import { TagModule } from './modules/tag/tag.module';
import { ReviewModule } from './modules/review/review.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    ContentModule,
    AiModule,
    HighlightModule,
    TagModule,
    ReviewModule,
    KnowledgeGraphModule,
    SystemConfigModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
