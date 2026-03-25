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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateContentDto, CreateTextContentDto, UpdateStatusDto } from './dto';

@ApiTags('内容')
@Controller('contents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

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

  @Delete(':id')
  @ApiOperation({ summary: '归档内容' })
  async archive(@Request() req, @Param('id') id: string) {
    return this.contentService.archive(req.user.userId, id);
  }
}
