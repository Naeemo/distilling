import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Technology' })
  @IsString()
  name: string;

  @ApiProperty({ example: '#3b82f6', required: false })
  @IsOptional()
  @IsString()
  color?: string;
}
