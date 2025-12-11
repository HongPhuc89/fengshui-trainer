import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { UserExperienceLog } from '../entities/user-experience-log.entity';
import { Level } from '../entities/level.entity';
import { ExperienceSourceType } from '../../../shares/enums/experience-source-type.enum';

@Injectable()
export class UserExperienceService {
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
   * Get level by XP amount
   */
  async getLevelByXP(xp: number): Promise<Level> {
    const levels = await this.levelRepository.find({
      order: { xp_required: 'DESC' },
    });

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
   */
  async getAllLevels(): Promise<Level[]> {
    return this.levelRepository.find({
      order: { level: 'ASC' },
    });
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
}
