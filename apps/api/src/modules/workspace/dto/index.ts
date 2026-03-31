import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWorkspaceArticleDto {
  @ApiProperty({
    example: '我想梳理一下 AI agent 在团队协作中的实际落地方式，尤其是任务拆分、可靠性和成本。',
    description: '用于生成文章草稿的初始想法',
  })
  @IsString()
  @MinLength(4)
  initialIdea: string;
}

export class UpdateWorkspaceArticleDto {
  @ApiProperty({ example: 'AI agent 团队协作落地观察', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: '这里是文章正文...', required: false })
  @IsOptional()
  @IsString()
  body?: string;
}
