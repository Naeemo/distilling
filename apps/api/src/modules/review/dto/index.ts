import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteReviewDto {
  @ApiProperty({ enum: ['AGAIN', 'HARD', 'GOOD', 'EASY'] })
  @IsEnum(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}
