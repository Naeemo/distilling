import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { BrowserModule } from '../browser/browser.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [BrowserModule, PrismaModule],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
