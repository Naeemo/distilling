import { Module } from '@nestjs/common';
import { EmailForwardingService } from './email-forwarding.service';
import { EmailReceivingService } from './email-receiving.service';
import { EmailController } from './email.controller';

@Module({
  providers: [EmailForwardingService, EmailReceivingService],
  controllers: [EmailController],
  exports: [EmailForwardingService],
})
export class EmailModule {}
