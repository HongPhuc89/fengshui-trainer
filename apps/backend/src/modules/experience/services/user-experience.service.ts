import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserExperienceLog } from '../entities/user-experience-log.entity';
import { Level } from '../entities/level.entity';
import { ExperienceSourceType } from '../../../shares/enums/experience-source-type.enum';
import { QueryCache } from '../../../shares/utils/query-optimization.util';

@Injectable()
export class UserExperienceService {
  // Cache for levels (they rarely change)
  private levelsCache = new QueryCache<Level[]>(3600); // 1 hour TTL

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserExperienceLog)
    private logRepository: Repository<UserExperienceLog>,
    @InjectRepository(Level)
    private levelRepository: Repository<Level>,
  ) {}

  /**
   * Award XP to a user and log the transaction
   */
  async awardXP(
    userId: number,
    sourceType: ExperienceSourceType,
    xp: number,
    sourceId?: number,
    description?: string,
  ): Promise<{ log: UserExperienceLog; levelUp: boolean; newLevel?: Level; previousLevel?: Level }> {
    // Create log entry
    const log = this.logRepository.create({
      user_id: userId,
      source_type: sourceType,
      source_id: sourceId,
      xp,
      description,
    });
    await this.logRepository.save(log);

    // Update user's total XP
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const previousXP = user.experience_points;
    user.experience_points += xp;
    await this.userRepository.save(user);

    // Check for level up
    const previousLevel = await this.getLevelByXP(previousXP);
    const newLevel = await this.getLevelByXP(user.experience_points);
    const levelUp = newLevel.level > previousLevel.level;

    return {
      log,
      levelUp,
      previousLevel: levelUp ? previousLevel : undefined,
      newLevel: levelUp ? newLevel : undefined,
    };
  }

  /**
   * Get user's XP summary with current and next level info
   */
  async getUserXPSummary(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const currentLevel = await this.getLevelByXP(user.experience_points);
    const nextLevel = await this.getNextLevel(currentLevel.level);

    return {
      user_id: userId,
      total_xp: user.experience_points,
      current_level: currentLevel,
      next_level: nextLevel
        ? {
            ...nextLevel,
            xp_remaining: nextLevel.xp_required - user.experience_points,
            progress_percentage: this.calculateProgress(
              user.experience_points,
              currentLevel.xp_required,
              nextLevel.xp_required,
            ),
          }
        : null,
    };
  }

  /**
   * Daily check-in - Awards 5 XP once per day
   */
  async dailyCheckIn(userId: number) {
    // Check if user already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCheckIn = await this.logRepository.findOne({
      where: {
        user_id: userId,
        source_type: ExperienceSourceType.DAILY_MISSION,
      },
      order: {
        created_at: 'DESC',
      },
    });

    // If already checked in today, return existing check-in
    if (todayCheckIn) {
      const checkInDate = new Date(todayCheckIn.created_at);
      checkInDate.setHours(0, 0, 0, 0);

      if (checkInDate.getTime() === today.getTime()) {
        return {
          success: false,
          message: 'Already checked in today',
          already_checked_in: true,
          last_checkin: todayCheckIn.created_at,
          xp_earned: 0,
        };
      }
    }

    // Award 5 XP for daily check-in
    const result = await this.awardXP(userId, ExperienceSourceType.DAILY_MISSION, 5, null, 'Daily check-in reward');

    return {
      success: true,
      message: 'Daily check-in successful!',
      already_checked_in: false,
      xp_earned: 5,
      level_up: result.levelUp,
      previous_level: result.previousLevel,
      current_level: result.newLevel,
    };
  }

  /**
   * Get leaderboard - Top 10 users by XP (normal users only)
   * Optimized to prevent N+1 query
   */
  async getLeaderboard() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :userRole', { userRole: 'NORMAL_USER' })
      .orderBy('user.experience_points', 'DESC')
      .take(10)
      .getMany();

    // Fetch all levels once to prevent N+1 query
    const allLevels = await this.levelRepository.find({
      order: { xp_required: 'DESC' },
    });

    // Get level info for each user using in-memory lookup
    const leaderboard = users.map((user, index) => {
      // Find level by XP in memory (no additional query)
      const level =
        allLevels.find((lvl) => user.experience_points >= lvl.xp_required) || allLevels[allLevels.length - 1];

      return {
        rank: index + 1,
        user_id: user.id,
        full_name: user.full_name || user.email?.split('@')[0] || 'User',
        email: user.email,
        experience_points: user.experience_points,
        level: {
          id: level.id,
          level: level.level,
          title: level.title,
          color: level.color,
        },
      };
    });

    return { data: leaderboard };
  }

  /**
   * Get user's XP history logs with pagination
   */
  async getUserXPLogs(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      sourceType?: ExperienceSourceType;
      startDate?: Date;
    } = {},
  ) {
    const { page = 1, limit = 20, sourceType, startDate } = options;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId })
      .orderBy('log.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (sourceType) {
      queryBuilder.andWhere('log.source_type = :sourceType', { sourceType });
    }

    if (startDate) {
      queryBuilder.andWhere('log.created_at >= :startDate', { startDate });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    // Get summary by source type
    const summaryQuery = this.logRepository
      .createQueryBuilder('log')
      .select('log.source_type', 'source_type')
      .addSelect('SUM(log.xp)', 'total_xp')
      .where('log.user_id = :userId', { userId })
      .groupBy('log.source_type');

    const summary = await summaryQuery.getRawMany();

    const bySource = summary.reduce(
      (acc, item) => {
        acc[item.source_type] = parseInt(item.total_xp as string);
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalXP = (Object.values(bySource) as number[]).reduce((sum, xp) => sum + xp, 0);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      summary: {
        total_xp_earned: totalXP,
        by_source: bySource,
      },
    };
  }

  /**
   * Get all users' XP logs (Admin)
   */
  async getAllUserLogs(
    options: {
      page?: number;
      limit?: number;
      sourceType?: ExperienceSourceType;
      sort?: string;
      order?: 'asc' | 'desc';
    } = {},
  ) {
    const { page = 1, limit = 25, sourceType, sort = 'created_at', order = 'desc' } = options;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy(`log.${sort}`, order.toUpperCase() as 'ASC' | 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (sourceType) {
      queryBuilder.andWhere('log.source_type = :sourceType', { sourceType });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
    };
  }

  /**
   * Get level by XP amount
   * Cached for better performance
   */
  async getLevelByXP(xp: number): Promise<Level> {
    // Try to get from cache first
    let levels = this.levelsCache.get('all_levels');

    if (!levels) {
      // Cache miss - fetch from database
      levels = await this.levelRepository.find({
        order: { xp_required: 'DESC' },
      });
      this.levelsCache.set('all_levels', levels);
    }

    const level = levels.find((level) => xp >= level.xp_required);
    return level || levels[levels.length - 1];
  }

  /**
   * Get next level
   */
  async getNextLevel(currentLevel: number): Promise<Level | null> {
    return this.levelRepository.findOne({
      where: { level: currentLevel + 1 },
    });
  }

  /**
   * Get all levels
   * Cached for better performance
   */
  async getAllLevels(): Promise<Level[]> {
    // Try to get from cache first
    let levels = this.levelsCache.get('all_levels');

    if (!levels) {
      // Cache miss - fetch from database
      levels = await this.levelRepository.find({
        order: { level: 'ASC' },
      });
      this.levelsCache.set('all_levels', levels);
    }

    return levels;
  }

  /**
   * Get level info by XP with progress calculation
   */
  async getLevelInfoByXP(xp: number) {
    const currentLevel = await this.getLevelByXP(xp);
    const nextLevel = await this.getNextLevel(currentLevel.level);

    if (!nextLevel) {
      return {
        current_level: currentLevel,
        next_level: null,
        progress: {
          xp_in_current_level: xp - currentLevel.xp_required,
          xp_to_next_level: 0,
          percentage: 100,
        },
      };
    }

    const xpInCurrentLevel = xp - currentLevel.xp_required;
    const xpToNextLevel = nextLevel.xp_required - xp;
    const percentage = (xpInCurrentLevel / (nextLevel.xp_required - currentLevel.xp_required)) * 100;

    return {
      current_level: currentLevel,
      next_level: nextLevel,
      progress: {
        xp_in_current_level: xpInCurrentLevel,
        xp_to_next_level: xpToNextLevel,
        percentage: Math.round(percentage * 10) / 10,
      },
    };
  }

  /**
   * Calculate progress percentage between two levels
   */
  private calculateProgress(currentXP: number, currentLevelXP: number, nextLevelXP: number): number {
    const xpInLevel = currentXP - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    return Math.round((xpInLevel / xpNeeded) * 1000) / 10;
  }

  /**
   * Get level by ID
   */
  async getLevelById(id: number): Promise<Level> {
    const level = await this.levelRepository.findOne({ where: { id } });
    if (!level) {
      throw new Error(`Level with ID ${id} not found`);
    }
    return level;
  }

  /**
   * Update level
   */
  async updateLevel(id: number, updateData: Partial<Level>): Promise<Level> {
    const level = await this.getLevelById(id);

    // Update fields
    if (updateData.title !== undefined) level.title = updateData.title;
    if (updateData.xp_required !== undefined) level.xp_required = updateData.xp_required;
    if (updateData.color !== undefined) level.color = updateData.color;
    if (updateData.icon !== undefined) level.icon = updateData.icon;
    if (updateData.rewards !== undefined) level.rewards = updateData.rewards;

    // Clear cache when level is updated
    this.levelsCache.clear('all_levels');

    return this.levelRepository.save(level);
  }
}
