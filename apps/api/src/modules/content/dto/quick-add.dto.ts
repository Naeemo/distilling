import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickAddContentDto {
  @ApiProperty({ 
    example: '看看这篇文章 https://example.com/article 讲得很有道理',
    description: '分享文本，会自动从中提取URL'
  })
  @IsString()
  shareText: string;

  @ApiProperty({ example: ['快捷指令'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: '笔记...', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class QuickAddResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  contentId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ required: false })
  message?: string;
}
