import { Module } from '@nestjs/common';
import { SmartSummaryService } from './smart-summary.service';

@Module({
  providers: [SmartSummaryService],
  exports: [SmartSummaryService],
})
export class SmartSummaryModule {}
