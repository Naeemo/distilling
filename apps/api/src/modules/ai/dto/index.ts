import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SummarizeDto {
  @ApiProperty()
  @IsString()
  contentId: string;

  @ApiProperty({ enum: ['QUICK', 'DETAILED', 'BULLET', 'QA'] })
  @IsEnum(['QUICK', 'DETAILED', 'BULLET', 'QA'])
  type: 'QUICK' | 'DETAILED' | 'BULLET' | 'QA';
}
