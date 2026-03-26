import { Module } from '@nestjs/common';
import { KnowledgeCardService } from './knowledge-card.service';

@Module({
  providers: [KnowledgeCardService],
  exports: [KnowledgeCardService],
})
export class KnowledgeCardModule {}
