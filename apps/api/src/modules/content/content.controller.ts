import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentService } from './content.service';
import {
  CreateContentDto,
  CreateImportedContentDto,
  CreateTextContentDto,
  UpdateStatusDto,
  UpdateReadingProgressDto,
  QuickAddContentDto,
} from './dto';

@ApiTags('内容')
@Controller('contents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('quick-add')
  @ApiOperation({ summary: '快速添加内容（iOS快捷指令用）' })
  async quickAdd(@Request() req, @Body() dto: QuickAddContentDto) {
    return this.contentService.quickAdd(
      req.user.userId,
      dto.shareText,
      dto.tags,
      dto.note,
    );
  }

  @Post()
  @ApiOperation({ summary: '添加内容（URL）' })
  async createFromUrl(@Request() req, @Body() dto: CreateContentDto) {
    return this.contentService.createFromUrl(
      req.user.userId,
      dto.url,
      dto.tags,
    );
  }

  @Post('text')
  @ApiOperation({ summary: '添加内容（纯文本）' })
  async createFromText(@Request() req, @Body() dto: CreateTextContentDto) {
    return this.contentService.createFromText(
      req.user.userId,
      dto.title,
      dto.contentText,
      dto.tags,
    );
  }

  @Post('import')
  @ApiOperation({ summary: '导入已提取的网页内容' })
  async createImported(@Request() req, @Body() dto: CreateImportedContentDto) {
    return this.contentService.createImported(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取内容列表' })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('tagId') tagId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findAll(req.user.userId, {
      status,
      tagId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('submissions')
  @ApiOperation({ summary: '获取添加记录时间轴' })
  async findSubmissions(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findSubmissions(
      req.user.userId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '获取内容详情' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.contentService.findOne(req.user.userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新阅读状态' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.contentService.updateStatus(req.user.userId, id, dto.status);
  }

  @Patch(':id/progress')
  @ApiOperation({ summary: '更新阅读进度' })
  async updateReadingProgress(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateReadingProgressDto,
  ) {
    return this.contentService.updateReadingProgress(req.user.userId, id, {
      progress: dto.progress,
      position: dto.position,
      readingTime: dto.readingTime,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: '归档内容' })
  async archive(@Request() req, @Param('id') id: string) {
    return this.contentService.archive(req.user.userId, id);
  }
}
