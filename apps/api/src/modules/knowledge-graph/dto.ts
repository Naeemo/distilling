import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RelationType } from '@prisma/client';

export class ContentInsightDto {
  @ApiProperty({ description: '主题标签', example: [{ name: 'AI', confidence: 0.92 }] })
  @IsOptional()
  topics?: { name: string; confidence: number }[];

  @ApiProperty({ description: '关键实体', example: [{ name: 'OpenAI', type: 'ORG', mentions: 5 }] })
  @IsOptional()
  keyEntities?: { name: string; type: string; mentions: number }[];

  @ApiProperty({ description: '情感分析', example: { overall: 'positive', score: 0.7 } })
  @IsOptional()
  @IsObject()
  sentiments?: { overall: string; score: number };

  @ApiProperty({ description: '立场', enum: ['supportive', 'critical', 'neutral', 'exploratory'] })
  @IsOptional()
  @IsString()
  stance?: string;

  @ApiProperty({ description: '关键主张' })
  @IsOptional()
  keyClaims?: string[];

  @ApiProperty({ description: '质量评分', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  qualityScore?: number;

  @ApiProperty({ description: '可信度评分', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  credibilityScore?: number;
}

export class CreateRelationDto {
  @ApiProperty({ description: '源文章ID' })
  @IsString()
  contentAId: string;

  @ApiProperty({ description: '目标文章ID' })
  @IsString()
  contentBId: string;

  @ApiProperty({ description: '关联类型', enum: RelationType })
  @IsEnum(RelationType)
  relationType: RelationType;

  @ApiProperty({ description: '关联强度', minimum: 0, maximum: 1 })
  @IsNumber()
  strength: number;

  @ApiProperty({ description: '关联描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '是否有方向性', required: false })
  @IsOptional()
  @IsBoolean()
  isDirectional?: boolean;
}

export class QueryRelationsDto {
  @ApiProperty({ description: '关联类型过滤', required: false, enum: RelationType })
  @IsOptional()
  @IsEnum(RelationType)
  relationType?: RelationType;

  @ApiProperty({ description: '最小关联强度', required: false, minimum: 0, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minStrength?: number;
}

export class GraphQueryDto {
  @ApiProperty({ description: '中心文章ID', required: false })
  @IsOptional()
  @IsString()
  centerContentId?: string;

  @ApiProperty({ description: '主题过滤', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ description: '最大节点数', required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxNodes?: number;

  @ApiProperty({ description: '时间范围开始', required: false })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiProperty({ description: '时间范围结束', required: false })
  @IsOptional()
  @IsString()
  toDate?: string;
}

export class ContentPositionDto {
  @ApiProperty({ description: '在信息世界中的位置' })
  position: {
    domain: string;        // 领域: tech, politics, science, etc.
    level: string;         // 深度: surface, intermediate, deep
    audience: string;      // 受众: general, professional, academic
    informationDensity: number; // 信息密度 0-1
  };

  @ApiProperty({ description: '关联网络统计' })
  networkStats: {
    relatedCount: number;      // 关联文章数
    similarTopics: number;     // 相似主题数
    contradictoryCount: number; // 对立观点数
    supportiveCount: number;   // 支持观点数
    entityConnections: number; // 实体连接数
  };

  @ApiProperty({ description: '核心主题簇' })
  topicClusters: {
    name: string;
    relevance: number;
    articleCount: number;
  }[];

  @ApiProperty({ description: '信息流中的角色' })
  role: {
    type: string;           // 'source' | 'synthesis' | 'commentary' | 'breaking'
    importance: number;     // 0-1
    uniqueness: number;     // 独特视角程度 0-1
  };
}
