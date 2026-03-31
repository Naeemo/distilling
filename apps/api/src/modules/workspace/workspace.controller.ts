import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateWorkspaceArticleDto, UpdateWorkspaceArticleDto } from './dto';
import { WorkspaceService } from './workspace.service';

@ApiTags('工作区')
@Controller('workspace/articles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({ summary: '根据初始想法创建工作区文章草稿' })
  async createArticle(@Request() req, @Body() dto: CreateWorkspaceArticleDto) {
    return this.workspaceService.createArticle(req.user.userId, dto.initialIdea);
  }

  @Get()
  @ApiOperation({ summary: '获取工作区文章列表' })
  async listArticles(@Request() req) {
    return this.workspaceService.listArticles(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工作区文章详情' })
  async getArticle(@Request() req, @Param('id') id: string) {
    return this.workspaceService.getArticle(req.user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工作区文章内容' })
  async updateArticle(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceArticleDto,
  ) {
    return this.workspaceService.updateArticle(req.user.userId, id, dto);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '重试生成工作区文章' })
  async retryArticle(@Request() req, @Param('id') id: string) {
    return this.workspaceService.retryArticle(req.user.userId, id);
  }
}
