import { Module } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphController } from './knowledge-graph.controller';

@Module({
  providers: [KnowledgeGraphService],
  controllers: [KnowledgeGraphController],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
