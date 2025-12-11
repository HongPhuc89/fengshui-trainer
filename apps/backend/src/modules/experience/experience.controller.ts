import { Controller, Get, Param, ParseIntPipe, Query, Patch, Body } from '@nestjs/common';
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
   * Get all users' XP logs (Admin only)
   * GET /api/experience/users?page=1&limit=25&source_type=quiz_attempt
   */
  @Get('users')
  async getAllUserLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '25',
    @Query('source_type') sourceType?: ExperienceSourceType,
    @Query('sort') sort: string = 'created_at',
    @Query('order') order: string = 'desc',
  ) {
    return this.userExperienceService.getAllUserLogs({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100), // Max 100 per page
      sourceType,
      sort,
      order: order.toLowerCase() as 'asc' | 'desc',
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
   * Get single level by ID
   * GET /api/experience/levels/:id
   */
  @Get('levels/:id')
  async getLevel(@Param('id', ParseIntPipe) id: number) {
    return this.userExperienceService.getLevelById(id);
  }

  /**
   * Update level
   * PATCH /api/experience/levels/:id
   */
  @Patch('levels/:id')
  async updateLevel(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    return this.userExperienceService.updateLevel(id, updateData);
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
