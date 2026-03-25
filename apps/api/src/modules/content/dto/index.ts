import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class UpdateStatusDto {
  @ApiProperty({ enum: ['UNREAD', 'READING', 'READ'] })
  @IsString()
  status: string;
}
