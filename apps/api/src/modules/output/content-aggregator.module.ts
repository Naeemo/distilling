import { Module } from '@nestjs/common';
import { ContentAggregatorService } from './content-aggregator.service';

@Module({
  providers: [ContentAggregatorService],
  exports: [ContentAggregatorService],
})
export class ContentAggregatorModule {}
