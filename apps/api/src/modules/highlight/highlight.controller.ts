import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HighlightService } from './highlight.service';
import { CreateHighlightDto, UpdateHighlightDto } from './dto';

@ApiTags('高亮')
@Controller('highlights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HighlightController {
  constructor(private readonly highlightService: HighlightService) {}

  @Post()
  @ApiOperation({ summary: '创建高亮' })
  async create(@Request() req, @Body() dto: CreateHighlightDto) {
    return this.highlightService.create(req.user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新高亮笔记' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateHighlightDto,
  ) {
    return this.highlightService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除高亮' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.highlightService.delete(req.user.userId, id);
  }
}
