import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserExperienceService } from './user-experience.service';
import { User } from '../../users/entities/user.entity';
import { UserExperienceLog } from '../entities/user-experience-log.entity';
import { Level } from '../entities/level.entity';
import { ExperienceSourceType } from '../../../shares/enums/experience-source-type.enum';

describe('UserExperienceService', () => {
  let service: UserExperienceService;
  let userRepository: Repository<User>;
  let logRepository: Repository<UserExperienceLog>;
  let levelRepository: Repository<Level>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    experience_points: 100,
    role: 'NORMAL_USER',
  };

  const mockLevels = [
    { id: 1, level: 1, title: 'Beginner', xp_required: 0, color: '#gray', icon: '🌱' },
    { id: 2, level: 2, title: 'Intermediate', xp_required: 100, color: '#blue', icon: '⭐' },
    { id: 3, level: 3, title: 'Advanced', xp_required: 500, color: '#gold', icon: '👑' },
  ];

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockLevelRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserExperienceService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserExperienceLog),
          useValue: mockLogRepository,
        },
        {
          provide: getRepositoryToken(Level),
          useValue: mockLevelRepository,
        },
      ],
    }).compile();

    service = module.get<UserExperienceService>(UserExperienceService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    logRepository = module.get<Repository<UserExperienceLog>>(getRepositoryToken(UserExperienceLog));
    levelRepository = module.get<Repository<Level>>(getRepositoryToken(Level));

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('awardXP', () => {
    it('should award XP to user and create log', async () => {
      const mockLog = {
        id: 1,
        user_id: 1,
        source_type: ExperienceSourceType.QUIZ_ATTEMPT,
        xp: 50,
      };

      mockLogRepository.create.mockReturnValue(mockLog);
      mockLogRepository.save.mockResolvedValue(mockLog);
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, experience_points: 150 });
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.awardXP(1, ExperienceSourceType.QUIZ_ATTEMPT, 50);

      expect(logRepository.create).toHaveBeenCalledWith({
        user_id: 1,
        source_type: ExperienceSourceType.QUIZ_ATTEMPT,
        source_id: undefined,
        xp: 50,
        description: undefined,
      });
      expect(logRepository.save).toHaveBeenCalled();
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.log).toEqual(mockLog);
    });

    it('should detect level up', async () => {
      const mockLog = { id: 1, user_id: 1, xp: 50 };
      const userBefore = { ...mockUser, experience_points: 80 };
      const userAfter = { ...mockUser, experience_points: 130 };

      mockLogRepository.create.mockReturnValue(mockLog);
      mockLogRepository.save.mockResolvedValue(mockLog);
      mockUserRepository.findOne.mockResolvedValue(userBefore);
      mockUserRepository.save.mockResolvedValue(userAfter);
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.awardXP(1, ExperienceSourceType.QUIZ_ATTEMPT, 50);

      expect(result.levelUp).toBe(true);
      expect(result.previousLevel).toBeDefined();
      expect(result.newLevel).toBeDefined();
    });
  });

  describe('getLeaderboard - Optimized (No N+1)', () => {
    it('should fetch leaderboard with only 2 queries', async () => {
      const mockUsers = [
        { id: 1, full_name: 'User 1', email: 'user1@test.com', experience_points: 500, role: 'NORMAL_USER' },
        { id: 2, full_name: 'User 2', email: 'user2@test.com', experience_points: 300, role: 'NORMAL_USER' },
        { id: 3, full_name: 'User 3', email: 'user3@test.com', experience_points: 100, role: 'NORMAL_USER' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.getLeaderboard();

      // Should only call levelRepository.find ONCE (not per user)
      expect(levelRepository.find).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].level).toBeDefined();
      expect(result.data[0].level.title).toBe('Advanced'); // 500 XP = Advanced
    });

    it('should assign correct levels based on XP', async () => {
      const mockUsers = [
        { id: 1, full_name: 'User 1', email: 'user1@test.com', experience_points: 600, role: 'NORMAL_USER' },
        { id: 2, full_name: 'User 2', email: 'user2@test.com', experience_points: 150, role: 'NORMAL_USER' },
        { id: 3, full_name: 'User 3', email: 'user3@test.com', experience_points: 50, role: 'NORMAL_USER' },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.getLeaderboard();

      expect(result.data[0].level.title).toBe('Advanced'); // 600 XP
      expect(result.data[1].level.title).toBe('Intermediate'); // 150 XP
      expect(result.data[2].level.title).toBe('Beginner'); // 50 XP
    });
  });

  describe('getLevelByXP - Cached', () => {
    it('should fetch levels from database on first call', async () => {
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.getLevelByXP(150);

      expect(levelRepository.find).toHaveBeenCalledTimes(1);
      expect(result.title).toBe('Intermediate');
    });

    it('should use cache on subsequent calls', async () => {
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      // First call - should hit database
      await service.getLevelByXP(150);
      expect(levelRepository.find).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getLevelByXP(200);
      expect(levelRepository.find).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Third call - should still use cache
      await service.getLevelByXP(50);
      expect(levelRepository.find).toHaveBeenCalledTimes(1); // Still 1, not 3
    });

    it('should return correct level for given XP', async () => {
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const level1 = await service.getLevelByXP(50);
      expect(level1.title).toBe('Beginner');

      const level2 = await service.getLevelByXP(150);
      expect(level2.title).toBe('Intermediate');

      const level3 = await service.getLevelByXP(600);
      expect(level3.title).toBe('Advanced');
    });
  });

  describe('getAllLevels - Cached', () => {
    it('should fetch levels from database on first call', async () => {
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.getAllLevels();

      expect(levelRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
    });

    it('should use cache on subsequent calls', async () => {
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      // First call
      await service.getAllLevels();
      expect(levelRepository.find).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getAllLevels();
      expect(levelRepository.find).toHaveBeenCalledTimes(1); // Still 1

      // Third call - should use cache
      await service.getAllLevels();
      expect(levelRepository.find).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('getUserXPSummary', () => {
    it('should return user XP summary with level info', async () => {
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser, experience_points: 150 });
      mockLevelRepository.find.mockResolvedValue(mockLevels);
      mockLevelRepository.findOne.mockResolvedValue(mockLevels[2]); // Next level

      const result = await service.getUserXPSummary(1);

      expect(result.user_id).toBe(1);
      expect(result.total_xp).toBe(150);
      expect(result.current_level).toBeDefined();
      expect(result.next_level).toBeDefined();
    });
  });

  describe('dailyCheckIn', () => {
    it('should award XP for first check-in of the day', async () => {
      mockLogRepository.findOne.mockResolvedValue(null); // No previous check-in
      mockLogRepository.create.mockReturnValue({ id: 1, xp: 5 });
      mockLogRepository.save.mockResolvedValue({ id: 1, xp: 5 });
      mockUserRepository.findOne.mockResolvedValue({ ...mockUser });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, experience_points: 105 });
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      const result = await service.dailyCheckIn(1);

      expect(result.success).toBe(true);
      expect(result.xp_earned).toBe(5);
      expect(result.already_checked_in).toBe(false);
    });

    it('should not award XP if already checked in today', async () => {
      const today = new Date();
      today.setHours(10, 0, 0, 0);

      mockLogRepository.findOne.mockResolvedValue({
        id: 1,
        created_at: today,
        source_type: ExperienceSourceType.DAILY_MISSION,
      });

      const result = await service.dailyCheckIn(1);

      expect(result.success).toBe(false);
      expect(result.already_checked_in).toBe(true);
      expect(result.xp_earned).toBe(0);
    });
  });

  describe('updateLevel', () => {
    it('should clear cache when level is updated', async () => {
      const mockLevel = { ...mockLevels[0] };
      mockLevelRepository.findOne.mockResolvedValue(mockLevel);
      mockLevelRepository.save.mockResolvedValue({ ...mockLevel, title: 'Updated' });
      mockLevelRepository.find.mockResolvedValue(mockLevels);

      // First, populate cache
      await service.getLevelByXP(50);
      expect(levelRepository.find).toHaveBeenCalledTimes(1);

      // Update level (should clear cache)
      await service.updateLevel(1, { title: 'Updated' });

      // Next call should hit database again (cache was cleared)
      await service.getLevelByXP(50);
      expect(levelRepository.find).toHaveBeenCalledTimes(2); // Called again after cache clear
    });
  });
});
