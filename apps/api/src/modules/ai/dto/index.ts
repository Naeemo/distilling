import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SummarizeDto {
  @ApiProperty()
  @IsString()
  contentId: string;

  @ApiProperty({ enum: ['QUICK', 'DETAILED', 'BULLET', 'QA'] })
  @IsEnum(['QUICK', 'DETAILED', 'BULLET', 'QA'])
  type: 'QUICK' | 'DETAILED' | 'BULLET' | 'QA';
}

export class AnalyzeArticleDto {
  @ApiProperty({ description: '文章标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '文章内容' })
  @IsString()
  content: string;
}
