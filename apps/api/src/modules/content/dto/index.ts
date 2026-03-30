import { IsString, IsOptional, IsArray, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export * from './quick-add.dto';

export class CreateContentDto {
  @ApiProperty({ example: 'https://example.com/article' })
  @IsString()
  url: string;

  @ApiProperty({ example: ['tag-id-1'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateTextContentDto {
  @ApiProperty({ example: 'My Notes' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Content text here...' })
  @IsString()
  contentText: string;

  @ApiProperty({ example: ['tag-id-1'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateImportedContentDto {
  @ApiProperty({ example: 'https://mp.weixin.qq.com/s/example' })
  @IsString()
  url: string;

  @ApiProperty({ example: '文章标题' })
  @IsString()
  title: string;

  @ApiProperty({ example: '文章正文...' })
  @IsString()
  contentText: string;

  @ApiProperty({ example: '作者名', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg', required: false })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiProperty({ example: '2026-03-30T10:00:00.000Z', required: false })
  @IsOptional()
  @IsString()
  publishTime?: string;

  @ApiProperty({ example: ['微信'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateStatusDto {
  @ApiProperty({ enum: ['UNREAD', 'READING', 'READ'] })
  @IsString()
  status: string;
}

export class UpdateReadingProgressDto {
  @ApiProperty({ description: '阅读进度 0-100', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiProperty({ description: '阅读位置', required: false })
  @IsOptional()
  @IsObject()
  position?: {
    scrollY: number;
    paragraphIndex?: number;
  };

  @ApiProperty({ description: '本次阅读时长（秒）', required: false })
  @IsOptional()
  @IsNumber()
  readingTime?: number;
}
