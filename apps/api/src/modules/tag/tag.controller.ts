import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto';

@ApiTags('标签')
@Controller('tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: '获取标签列表' })
  async findAll(@Request() req) {
    const tags = await this.tagService.findAll(req.user.userId);
    return { tags };
  }

  @Post()
  @ApiOperation({ summary: '创建标签' })
  async create(@Request() req, @Body() dto: CreateTagDto) {
    return this.tagService.create(req.user.userId, dto.name, dto.color);
  }
}

@ApiTags('内容标签')
@Controller('contents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentTagController {
  constructor(private readonly tagService: TagService) {}

  @Post(':id/tags')
  @ApiOperation({ summary: '为内容添加标签' })
  async addTag(
    @Request() req,
    @Param('id') contentId: string,
    @Body() dto: { tagId: string },
  ) {
    return this.tagService.addTagToContent(contentId, dto.tagId);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: '移除内容标签' })
  async removeTag(
    @Request() req,
    @Param('id') contentId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tagService.removeTagFromContent(contentId, tagId);
  }
}
