import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHighlightDto {
  @ApiProperty()
  @IsString()
  contentId: string;

  @ApiProperty()
  @IsString()
  highlightText: string;

  @ApiProperty()
  @IsObject()
  position: {
    startOffset: number;
    endOffset: number;
    paragraphIndex?: number;
  };

  @ApiProperty({ required: false, enum: ['yellow', 'green', 'blue', 'pink'] })
  @IsOptional()
  @IsEnum(['yellow', 'green', 'blue', 'pink'])
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateHighlightDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, enum: ['yellow', 'green', 'blue', 'pink'] })
  @IsOptional()
  @IsEnum(['yellow', 'green', 'blue', 'pink'])
  color?: string;
}
