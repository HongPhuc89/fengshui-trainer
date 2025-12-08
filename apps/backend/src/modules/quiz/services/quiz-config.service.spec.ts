import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizConfigService } from './quiz-config.service';
import { QuizConfig } from '../entities/quiz-config.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('QuizConfigService', () => {
    let service: QuizConfigService;
    let repository: jest.Mocked<Repository<QuizConfig>>;

    const mockQuizConfig: Partial<QuizConfig> = {
        id: 1,
        chapter_id: 1,
        title: 'Test Quiz',
        description: 'Test Description',
        questions_per_quiz: 10,
        time_limit_minutes: 30,
        passing_score_percentage: 70,
        easy_percentage: 40,
        medium_percentage: 40,
        hard_percentage: 20,
        is_active: true,
        shuffle_questions: false,
        shuffle_options: true,
        show_results_immediately: true,
        max_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                QuizConfigService,
                {
                    provide: getRepositoryToken(QuizConfig),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<QuizConfigService>(QuizConfigService);
        repository = module.get(getRepositoryToken(QuizConfig));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a new quiz config', async () => {
            const createDto = {
                title: 'New Quiz',
                description: 'New Description',
                questions_per_quiz: 15,
                time_limit_minutes: 45,
                passing_score_percentage: 75,
                easy_percentage: 30,
                medium_percentage: 50,
                hard_percentage: 20,
                is_active: true,
                shuffle_questions: true,
                shuffle_options: true,
                show_results_immediately: true,
                max_attempts: 3,
            };

            repository.findOne.mockResolvedValue(null);
            repository.create.mockReturnValue(mockQuizConfig as QuizConfig);
            repository.save.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.create(1, createDto);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.create).toHaveBeenCalledWith({
                chapter_id: 1,
                ...createDto,
            });
            expect(repository.save).toHaveBeenCalled();
            expect(result).toEqual(mockQuizConfig);
        });

        it('should throw ConflictException if config already exists', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            await expect(
                service.create(1, {
                    title: 'Test',
                    questions_per_quiz: 10,
                    time_limit_minutes: 30,
                    passing_score_percentage: 70,
                    easy_percentage: 40,
                    medium_percentage: 40,
                    hard_percentage: 20,
                }),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw BadRequestException if difficulty percentages do not sum to 100', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.create(1, {
                    title: 'Test',
                    questions_per_quiz: 10,
                    time_limit_minutes: 30,
                    passing_score_percentage: 70,
                    easy_percentage: 30,
                    medium_percentage: 30,
                    hard_percentage: 30, // Sum = 90, not 100
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if any percentage is out of range', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(
                service.create(1, {
                    title: 'Test',
                    questions_per_quiz: 10,
                    time_limit_minutes: 30,
                    passing_score_percentage: 70,
                    easy_percentage: 150, // Out of range
                    medium_percentage: -30,
                    hard_percentage: -20,
                }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('findByChapterId', () => {
        it('should return quiz config for a chapter', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.findByChapterId(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(result).toEqual(mockQuizConfig);
        });

        it('should throw NotFoundException if config not found', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.findByChapterId(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByChapterIdOrNull', () => {
        it('should return quiz config if exists', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.findByChapterIdOrNull(1);

            expect(result).toEqual(mockQuizConfig);
        });

        it('should return null if config does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            const result = await service.findByChapterIdOrNull(999);

            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should update quiz config', async () => {
            const updateDto = {
                title: 'Updated Quiz',
                passing_score_percentage: 80,
            };

            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);
            repository.save.mockResolvedValue({ ...mockQuizConfig, ...updateDto } as QuizConfig);

            const result = await service.update(1, updateDto);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.save).toHaveBeenCalled();
            expect(result.title).toBe('Updated Quiz');
        });

        it('should validate difficulty distribution when updating percentages', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            await expect(
                service.update(1, {
                    easy_percentage: 50,
                    medium_percentage: 30,
                    // hard_percentage not provided, will use existing 20%, sum = 100
                }),
            ).resolves.toBeDefined();
        });

        it('should throw BadRequestException if updated difficulty percentages invalid', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            await expect(
                service.update(1, {
                    easy_percentage: 60,
                    medium_percentage: 60,
                    hard_percentage: 60, // Sum = 180
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException if config not found', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.update(999, { title: 'Test' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('delete', () => {
        it('should delete quiz config', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);
            repository.remove.mockResolvedValue(mockQuizConfig as QuizConfig);

            await service.delete(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.remove).toHaveBeenCalledWith(mockQuizConfig);
        });

        it('should throw NotFoundException if config not found', async () => {
            repository.findOne.mockResolvedValue(null);

            await expect(service.delete(999)).rejects.toThrow(NotFoundException);
        });
    });

    describe('createDefaultConfig', () => {
        it('should create default config for a chapter', async () => {
            repository.findOne.mockResolvedValue(null);
            repository.create.mockReturnValue(mockQuizConfig as QuizConfig);
            repository.save.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.createDefaultConfig(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    chapter_id: 1,
                    title: 'Chapter Quiz',
                    questions_per_quiz: 10,
                    time_limit_minutes: 30,
                    passing_score_percentage: 70,
                    easy_percentage: 40,
                    medium_percentage: 40,
                    hard_percentage: 20,
                }),
            );
            expect(result).toEqual(mockQuizConfig);
        });

        it('should return existing config if already exists', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.createDefaultConfig(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.create).not.toHaveBeenCalled();
            expect(result).toEqual(mockQuizConfig);
        });
    });

    describe('getOrCreateDefault', () => {
        it('should return existing config if found', async () => {
            repository.findOne.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.getOrCreateDefault(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { chapter_id: 1 } });
            expect(repository.create).not.toHaveBeenCalled();
            expect(result).toEqual(mockQuizConfig);
        });

        it('should create default config if not found', async () => {
            repository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
            repository.create.mockReturnValue(mockQuizConfig as QuizConfig);
            repository.save.mockResolvedValue(mockQuizConfig as QuizConfig);

            const result = await service.getOrCreateDefault(1);

            expect(repository.create).toHaveBeenCalled();
            expect(result).toEqual(mockQuizConfig);
        });
    });

    describe('toResponseDto', () => {
        it('should convert entity to response DTO', () => {
            const result = service.toResponseDto(mockQuizConfig as QuizConfig);

            expect(result).toEqual({
                id: mockQuizConfig.id,
                chapter_id: mockQuizConfig.chapter_id,
                title: mockQuizConfig.title,
                description: mockQuizConfig.description,
                questions_per_quiz: mockQuizConfig.questions_per_quiz,
                time_limit_minutes: mockQuizConfig.time_limit_minutes,
                passing_score_percentage: mockQuizConfig.passing_score_percentage,
                easy_percentage: mockQuizConfig.easy_percentage,
                medium_percentage: mockQuizConfig.medium_percentage,
                hard_percentage: mockQuizConfig.hard_percentage,
                is_active: mockQuizConfig.is_active,
                shuffle_questions: mockQuizConfig.shuffle_questions,
                shuffle_options: mockQuizConfig.shuffle_options,
                show_results_immediately: mockQuizConfig.show_results_immediately,
                max_attempts: mockQuizConfig.max_attempts,
                created_at: mockQuizConfig.created_at,
                updated_at: mockQuizConfig.updated_at,
            });
        });
    });

    describe('validateDifficultyDistribution', () => {
        it('should not throw error for valid distribution', () => {
            expect(() => service['validateDifficultyDistribution'](40, 40, 20)).not.toThrow();
            expect(() => service['validateDifficultyDistribution'](33, 33, 34)).not.toThrow();
            expect(() => service['validateDifficultyDistribution'](0, 0, 100)).not.toThrow();
        });

        it('should throw BadRequestException if sum is not 100', () => {
            expect(() => service['validateDifficultyDistribution'](40, 40, 30)).toThrow(BadRequestException);
            expect(() => service['validateDifficultyDistribution'](50, 50, 50)).toThrow(BadRequestException);
            expect(() => service['validateDifficultyDistribution'](10, 10, 10)).toThrow(BadRequestException);
        });

        it('should throw BadRequestException if any percentage is negative', () => {
            expect(() => service['validateDifficultyDistribution'](-10, 60, 50)).toThrow(BadRequestException);
            expect(() => service['validateDifficultyDistribution'](40, -20, 80)).toThrow(BadRequestException);
        });

        it('should throw BadRequestException if any percentage exceeds 100', () => {
            expect(() => service['validateDifficultyDistribution'](150, -30, -20)).toThrow(BadRequestException);
            expect(() => service['validateDifficultyDistribution'](40, 120, -60)).toThrow(BadRequestException);
        });
    });
});
