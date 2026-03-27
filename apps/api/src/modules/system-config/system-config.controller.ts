import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SystemConfigService } from './system-config.service';
import { SystemConfigDto, UpdateSystemConfigDto, CreateSystemConfigDto, LLMConfigDto } from './dto';

@Controller('system-config')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SystemConfigController {
  constructor(private readonly configService: SystemConfigService) {}

  // ==================== 通用配置 API ====================

  @Get()
  async findAll(@Query('category') category?: string): Promise<SystemConfigDto[]> {
    return this.configService.findAll(category);
  }

  @Get(':key')
  async findOne(@Param('key') key: string): Promise<SystemConfigDto | null> {
    return this.configService.findByKey(key);
  }

  @Post()
  async create(
    @Body() data: CreateSystemConfigDto,
    @Request() req,
  ): Promise<SystemConfigDto> {
    return this.configService.create(data, req.user.userId);
  }

  @Put(':key')
  async update(
    @Param('key') key: string,
    @Body() data: UpdateSystemConfigDto,
    @Request() req,
  ): Promise<SystemConfigDto> {
    return this.configService.update(key, data, req.user.userId);
  }

  @Delete(':key')
  async delete(@Param('key') key: string): Promise<{ success: boolean }> {
    await this.configService.delete(key);
    return { success: true };
  }

  // ==================== LLM 配置专用 API ====================

  @Get('llm/config')
  async getLLMConfig(): Promise<LLMConfigDto> {
    return this.configService.getLLMConfig();
  }

  @Post('llm/config')
  async saveLLMConfig(
    @Body() config: LLMConfigDto,
    @Request() req,
  ): Promise<{ success: boolean }> {
    await this.configService.saveLLMConfig(config, req.user.userId);
    return { success: true };
  }

  // ==================== 初始化 API ====================

  @Post('initialize')
  async initialize(): Promise<{ success: boolean; message: string }> {
    await this.configService.initializeDefaults();
    return { success: true, message: '默认配置已初始化' };
  }
}