import { Module } from '@nestjs/common';
import { DifficultyAdaptorService } from './difficulty-adaptor.service';

@Module({
  providers: [DifficultyAdaptorService],
  exports: [DifficultyAdaptorService],
})
export class DifficultyAdaptorModule {}
