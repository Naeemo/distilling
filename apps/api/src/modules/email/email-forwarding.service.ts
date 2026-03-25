import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class EmailForwardingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 为用户生成专属邮件转发地址
   */
  async generateEmailAddress(userId: string): Promise<string> {
    // 检查用户是否已有配置
    const existing = await this.prisma.emailForwardingConfig.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing.emailAddress;
    }

    // 生成随机地址前缀
    const randomPrefix = randomBytes(8).toString('hex'); // 16位随机字符串
    const emailAddress = `save-${randomPrefix}@infodigest.app`;

    // 检查是否已存在（理论上概率极低）
    const addressExists = await this.prisma.emailForwardingConfig.findUnique({
      where: { emailAddress },
    });

    if (addressExists) {
      // 重新生成
      return this.generateEmailAddress(userId);
    }

    // 创建配置
    await this.prisma.emailForwardingConfig.create({
      data: {
        userId,
        emailAddress,
      },
    });

    return emailAddress;
  }

  /**
   * 获取用户的邮件转发配置
   */
  async getConfig(userId: string) {
    return this.prisma.emailForwardingConfig.findUnique({
      where: { userId },
    });
  }

  /**
   * 启用/禁用邮件转发
   */
  async toggleEmailForwarding(userId: string, isActive: boolean) {
    const config = await this.prisma.emailForwardingConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      throw new ConflictException('邮件转发未配置');
    }

    return this.prisma.emailForwardingConfig.update({
      where: { userId },
      data: { isActive },
    });
  }

  /**
   * 重新生成邮箱地址
   */
  async regenerateEmailAddress(userId: string): Promise<string> {
    // 删除旧配置
    await this.prisma.emailForwardingConfig.deleteMany({
      where: { userId },
    });

    // 生成新地址
    return this.generateEmailAddress(userId);
  }

  /**
   * 根据邮箱地址查找用户ID
   */
  async findUserByEmailAddress(emailAddress: string): Promise<string | null> {
    const config = await this.prisma.emailForwardingConfig.findUnique({
      where: { emailAddress },
    });

    return config?.userId || null;
  }
}
