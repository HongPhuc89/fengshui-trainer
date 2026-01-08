import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';
import { ReadingProgressService, UpdateProgressDto } from '../reading-progress.service';

@Controller('chapters')
@UseGuards(JwtAuthGuard)
export class ReadingProgressController {
  constructor(private readonly progressService: ReadingProgressService) {}

  @Get(':chapterId/progress')
  async getProgress(@Param('chapterId', ParseIntPipe) chapterId: number, @Request() req) {
    const progress = await this.progressService.getProgress(req.user.id, chapterId);

    if (!progress) {
      return {
        scrollPosition: 0,
        readingTimeSeconds: 0,
        completed: false,
        lastReadAt: null,
      };
    }

    return {
      scrollPosition: progress.scrollPosition,
      readingTimeSeconds: progress.readingTimeSeconds,
      completed: progress.completed,
      lastReadAt: progress.lastReadAt,
    };
  }

  @Put(':chapterId/progress')
  async updateProgress(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() data: UpdateProgressDto,
    @Request() req,
  ) {
    const progress = await this.progressService.updateProgress(req.user.id, chapterId, data);

    return {
      scrollPosition: progress.scrollPosition,
      readingTimeSeconds: progress.readingTimeSeconds,
      completed: progress.completed,
      lastReadAt: progress.lastReadAt,
    };
  }

  @Post(':chapterId/complete')
  async markAsCompleted(@Param('chapterId', ParseIntPipe) chapterId: number, @Request() req) {
    const progress = await this.progressService.markAsCompleted(req.user.id, chapterId);

    return {
      scrollPosition: progress.scrollPosition,
      completed: progress.completed,
      lastReadAt: progress.lastReadAt,
    };
  }

  @Delete(':chapterId/progress')
  async deleteProgress(@Param('chapterId', ParseIntPipe) chapterId: number, @Request() req) {
    await this.progressService.deleteProgress(req.user.id, chapterId);
    return { success: true };
  }
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserProgressController {
  constructor(private readonly progressService: ReadingProgressService) {}

  @Get('progress')
  async getAllProgress(@Request() req) {
    const progressList = await this.progressService.getAllUserProgress(req.user.id);

    return progressList.map((p) => ({
      chapterId: p.chapterId,
      scrollPosition: p.scrollPosition,
      readingTimeSeconds: p.readingTimeSeconds,
      completed: p.completed,
      lastReadAt: p.lastReadAt,
    }));
  }
}
