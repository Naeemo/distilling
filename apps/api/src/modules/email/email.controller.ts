import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Request, 
  UseGuards,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailForwardingService } from './email-forwarding.service';
import { EmailReceivingService } from './email-receiving.service';

// Mailgun webhook payload interface
interface MailgunWebhookPayload {
  recipient: string;
  sender: string;
  subject: string;
  'body-plain'?: string;
  'body-html'?: string;
  timestamp: number;
  token: string;
  signature: string;
}

// SendGrid webhook payload interface
interface SendGridWebhookPayload {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

@Controller('api/v1/email')
export class EmailController {
  constructor(
    private emailForwardingService: EmailForwardingService,
    private emailReceivingService: EmailReceivingService,
  ) {}

  /**
   * 获取或生成用户的邮件转发地址
   */
  @Get('forwarding-address')
  @UseGuards(JwtAuthGuard)
  async getForwardingAddress(@Request() req) {
    const userId = req.user.userId;
    
    let config = await this.emailForwardingService.getConfig(userId);
    
    if (!config) {
      const emailAddress = await this.emailForwardingService.generateEmailAddress(userId);
      config = await this.emailForwardingService.getConfig(userId);
    }

    return {
      success: true,
      data: {
        emailAddress: config.emailAddress,
        isActive: config.isActive,
        createdAt: config.createdAt,
      },
    };
  }

  /**
   * 重新生成邮件地址
   */
  @Post('regenerate-address')
  @UseGuards(JwtAuthGuard)
  async regenerateAddress(@Request() req) {
    const userId = req.user.userId;
    const newAddress = await this.emailForwardingService.regenerateEmailAddress(userId);
    
    return {
      success: true,
      data: { emailAddress: newAddress },
    };
  }

  /**
   * 启用/禁用邮件转发
   */
  @Post('toggle')
  @UseGuards(JwtAuthGuard)
  async toggleForwarding(@Request() req, @Body() body: { isActive: boolean }) {
    const userId = req.user.userId;
    const config = await this.emailForwardingService.toggleEmailForwarding(userId, body.isActive);
    
    return {
      success: true,
      data: { isActive: config.isActive },
    };
  }

  /**
   * 获取邮件处理历史
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getEmailHistory(@Request() req) {
    const userId = req.user.userId;
    const history = await this.emailReceivingService.getEmailHistory(userId);
    
    return {
      success: true,
      data: history,
    };
  }

  /**
   * Mailgun webhook - 接收邮件
   */
  @Post('webhook/mailgun')
  async handleMailgunWebhook(@Body() payload: MailgunWebhookPayload) {
    // TODO: 验证 Mailgun webhook 签名
    // const isValid = this.verifyMailgunSignature(payload);
    // if (!isValid) throw new UnauthorizedException('Invalid signature');

    const result = await this.emailReceivingService.receiveEmail({
      to: payload.recipient,
      from: payload.sender,
      subject: payload.subject,
      text: payload['body-plain'],
      html: payload['body-html'],
    });

    return result;
  }

  /**
   * SendGrid webhook - 接收邮件
   */
  @Post('webhook/sendgrid')
  async handleSendgridWebhook(@Body() payload: SendGridWebhookPayload) {
    const result = await this.emailReceivingService.receiveEmail({
      to: payload.to,
      from: payload.from,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return result;
  }

  /**
   * 通用邮件接收端点（用于测试或自定义接收器）
   */
  @Post('receive')
  async receiveEmail(@Body() payload: {
    to: string;
    from: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    if (!payload.to || !payload.from || !payload.subject) {
      throw new BadRequestException('Missing required fields: to, from, subject');
    }

    const result = await this.emailReceivingService.receiveEmail(payload);
    return result;
  }

  /**
   * 重试处理失败的邮件
   */
  @Post('retry')
  @UseGuards(JwtAuthGuard)
  async retryEmail(@Request() req, @Body() body: { emailId: string }) {
    const userId = req.user.userId;
    return this.emailReceivingService.retryFailedEmail(userId, body.emailId);
  }

  // TODO: 实现 Mailgun webhook 签名验证
  // private verifyMailgunSignature(payload: MailgunWebhookPayload): boolean {
  //   const crypto = require('crypto');
  //   const apiKey = process.env.MAILGUN_API_KEY;
  //   const encodedToken = crypto
  //     .createHmac('sha256', apiKey)
  //     .update(payload.timestamp + payload.token)
  //     .digest('hex');
  //   return encodedToken === payload.signature;
  // }
}
