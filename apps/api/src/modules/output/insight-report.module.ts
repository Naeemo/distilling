import { Module } from '@nestjs/common';
import { InsightReportService } from './insight-report.service';

@Module({
  providers: [InsightReportService],
  exports: [InsightReportService],
})
export class InsightReportModule {}
