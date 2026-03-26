import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeGraphService } from './knowledge-graph.service';
import {
  ContentInsightDto,
  CreateRelationDto,
  QueryRelationsDto,
  GraphQueryDto,
} from './dto';

@ApiTags('知识图谱')
@Controller('knowledge-graph')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeGraphController {
  constructor(private readonly kgService: KnowledgeGraphService) {}

  // ==================== 内容洞察 ====================

  @Post('contents/:contentId/insight')
  @ApiOperation({ summary: '分析并保存内容洞察' })
  async analyzeContent(
    @Request() req,
    @Param('contentId') contentId: string,
    @Body() dto: ContentInsightDto,
  ) {
    return this.kgService.analyzeContent(req.user.userId, contentId, {
      topics: dto.topics,
      keyEntities: dto.keyEntities,
      sentiments: dto.sentiments,
      stance: dto.stance,
      keyClaims: dto.keyClaims,
      qualityScore: dto.qualityScore,
      credibilityScore: dto.credibilityScore,
    });
  }

  @Get('contents/:contentId/insight')
  @ApiOperation({ summary: '获取内容洞察' })
  async getContentInsight(
    @Request() req,
    @Param('contentId') contentId: string,
  ) {
    return this.kgService.getContentInsight(req.user.userId, contentId);
  }

  // ==================== 内容关联 ====================

  @Post('relations')
  @ApiOperation({ summary: '创建文章关联' })
  async createRelation(
    @Request() req,
    @Body() dto: CreateRelationDto,
  ) {
    return this.kgService.createRelation(req.user.userId, dto);
  }

  @Get('contents/:contentId/relations')
  @ApiOperation({ summary: '获取文章的关联关系' })
  async getContentRelations(
    @Request() req,
    @Param('contentId') contentId: string,
    @Query() query: QueryRelationsDto,
  ) {
    return this.kgService.getContentRelations(req.user.userId, contentId, {
      relationType: query.relationType,
      minStrength: query.minStrength,
    });
  }

  @Get('contents/:contentId/position')
  @ApiOperation({ summary: '获取文章在信息世界中的位置', description: '回答"它在信息世界里处于什么位置"' })
  async getContentPosition(
    @Request() req,
    @Param('contentId') contentId: string,
  ) {
    return this.kgService.getContentPosition(req.user.userId, contentId);
  }

  // ==================== 知识图谱可视化 ====================

  @Get('graph')
  @ApiOperation({ summary: '获取知识图谱数据', description: '用于力导向图可视化' })
  async getKnowledgeGraph(
    @Request() req,
    @Query() query: GraphQueryDto,
  ) {
    return this.kgService.getKnowledgeGraph(req.user.userId, {
      centerContentId: query.centerContentId,
      maxNodes: query.maxNodes,
      topic: query.topic,
      fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
      toDate: query.toDate ? new Date(query.toDate) : undefined,
    });
  }

  // ==================== 自动发现 ====================

  @Get('contents/:contentId/discover')
  @ApiOperation({ summary: '自动发现文章关联', description: 'AI自动发现可能的关联' })
  async discoverRelations(
    @Request() req,
    @Param('contentId') contentId: string,
  ) {
    return this.kgService.discoverRelations(req.user.userId, contentId);
  }
}
