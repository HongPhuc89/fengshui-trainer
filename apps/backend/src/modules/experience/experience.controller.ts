import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { UserExperienceService } from './services/user-experience.service';
import { ExperienceSourceType } from '../../shares/enums/experience-source-type.enum';

@Controller('experience')
export class ExperienceController {
  constructor(private readonly userExperienceService: UserExperienceService) {}

  /**
   * Get user's XP summary
   * GET /api/experience/users/:userId
   */
  @Get('users/:userId')
  async getUserXPSummary(@Param('userId', ParseIntPipe) userId: number) {
    return this.userExperienceService.getUserXPSummary(userId);
  }

  /**
   * Get user's XP history logs
   * GET /api/experience/users/:userId/logs?page=1&limit=20&source_type=quiz_attempt
   */
  @Get('users/:userId/logs')
  async getUserXPLogs(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('source_type') sourceType?: ExperienceSourceType,
    @Query('start_date') startDate?: string,
  ) {
    return this.userExperienceService.getUserXPLogs(userId, {
      page,
      limit,
      sourceType,
      startDate: startDate ? new Date(startDate) : undefined,
    });
  }

  /**
   * Get all levels/ranks
   * GET /api/experience/levels
   */
  @Get('levels')
  async getAllLevels() {
    const levels = await this.userExperienceService.getAllLevels();
    return { data: levels };
  }

  /**
   * Get level info by XP amount
   * GET /api/experience/levels/by-xp/:xp
   */
  @Get('levels/by-xp/:xp')
  async getLevelByXP(@Param('xp', ParseIntPipe) xp: number) {
    return this.userExperienceService.getLevelInfoByXP(xp);
  }
}
