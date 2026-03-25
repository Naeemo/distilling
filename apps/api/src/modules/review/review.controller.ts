import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewService } from './review.service';
import { CompleteReviewDto } from './dto';

@ApiTags('复习')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('today')
  @ApiOperation({ summary: '获取今日复习队列' })
  async getTodayReviews(@Request() req) {
    return this.reviewService.getTodayReviews(req.user.userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: '获取 upcoming 复习' })
  async getUpcomingReviews(
    @Request() req,
    @Query('days') days?: string,
  ) {
    return this.reviewService.getUpcomingReviews(
      req.user.userId,
      days ? parseInt(days, 10) : 7,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: '获取复习统计' })
  async getStats(@Request() req) {
    return this.reviewService.getReviewStats(req.user.userId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: '完成复习' })
  async completeReview(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: CompleteReviewDto,
  ) {
    return this.reviewService.completeReview(req.user.userId, id, dto.rating);
  }
}
