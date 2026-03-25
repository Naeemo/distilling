import { Module, OnModuleDestroy } from '@nestjs/common';
import { BrowserService } from './browser.service';

@Module({
  providers: [BrowserService],
  exports: [BrowserService],
})
export class BrowserModule implements OnModuleDestroy {
  constructor(private readonly browserService: BrowserService) {}

  async onModuleDestroy() {
    await this.browserService.close();
  }
}
