import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizConfig } from '../entities/quiz-config.entity';
import { CreateQuizConfigDto, UpdateQuizConfigDto, QuizConfigResponseDto } from '../dtos/create-quiz-config.dto';

@Injectable()
export class QuizConfigService {
    constructor(
        @InjectRepository(QuizConfig)
        private readonly configRepository: Repository<QuizConfig>,
    ) { }

    /**
     * Create a new quiz configuration for a chapter
     */
    async create(chapterId: number, createDto: CreateQuizConfigDto): Promise<QuizConfig> {
        // Check if config already exists for this chapter
        const existing = await this.configRepository.findOne({ where: { chapter_id: chapterId } });
        if (existing) {
            throw new ConflictException(`Quiz config already exists for chapter ${chapterId}`);
        }

        // Validate difficulty distribution
        this.validateDifficultyDistribution(
            createDto.easy_percentage,
            createDto.medium_percentage,
            createDto.hard_percentage,
        );

        const config = this.configRepository.create({
            chapter_id: chapterId,
            ...createDto,
        });

        return this.configRepository.save(config);
    }

    /**
     * Find quiz configuration by chapter ID
     */
    async findByChapterId(chapterId: number): Promise<QuizConfig> {
        const config = await this.configRepository.findOne({ where: { chapter_id: chapterId } });
        if (!config) {
            throw new NotFoundException(`Quiz config not found for chapter ${chapterId}`);
        }
        return config;
    }

    /**
     * Find quiz configuration by chapter ID or return null
     */
    async findByChapterIdOrNull(chapterId: number): Promise<QuizConfig | null> {
        return this.configRepository.findOne({ where: { chapter_id: chapterId } });
    }

    /**
     * Update quiz configuration
     */
    async update(chapterId: number, updateDto: UpdateQuizConfigDto): Promise<QuizConfig> {
        const config = await this.findByChapterId(chapterId);

        // Validate difficulty distribution if any percentage is being updated
        if (
            updateDto.easy_percentage !== undefined ||
            updateDto.medium_percentage !== undefined ||
            updateDto.hard_percentage !== undefined
        ) {
            const easy = updateDto.easy_percentage ?? config.easy_percentage;
            const medium = updateDto.medium_percentage ?? config.medium_percentage;
            const hard = updateDto.hard_percentage ?? config.hard_percentage;

            this.validateDifficultyDistribution(easy, medium, hard);
        }

        Object.assign(config, updateDto);
        return this.configRepository.save(config);
    }

    /**
     * Delete quiz configuration
     */
    async delete(chapterId: number): Promise<void> {
        const config = await this.findByChapterId(chapterId);
        await this.configRepository.remove(config);
    }

    /**
     * Create default quiz configuration for a chapter
     */
    async createDefaultConfig(chapterId: number): Promise<QuizConfig> {
        // Check if config already exists
        const existing = await this.findByChapterIdOrNull(chapterId);
        if (existing) {
            return existing; // Return existing config instead of throwing error
        }

        const defaultConfig: CreateQuizConfigDto = {
            title: 'Chapter Quiz',
            description: 'Test your knowledge of this chapter',
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
        };

        const config = this.configRepository.create({
            chapter_id: chapterId,
            ...defaultConfig,
        });

        return this.configRepository.save(config);
    }

    /**
     * Validate that difficulty percentages sum to 100
     */
    private validateDifficultyDistribution(easy: number, medium: number, hard: number): void {
        const total = easy + medium + hard;
        if (total !== 100) {
            throw new BadRequestException(
                `Difficulty percentages must sum to 100. Current sum: ${total} (Easy: ${easy}%, Medium: ${medium}%, Hard: ${hard}%)`,
            );
        }

        // Validate individual percentages are within range
        if (easy < 0 || easy > 100) {
            throw new BadRequestException(`Easy percentage must be between 0 and 100. Got: ${easy}`);
        }
        if (medium < 0 || medium > 100) {
            throw new BadRequestException(`Medium percentage must be between 0 and 100. Got: ${medium}`);
        }
        if (hard < 0 || hard > 100) {
            throw new BadRequestException(`Hard percentage must be between 0 and 100. Got: ${hard}`);
        }
    }

    /**
     * Get quiz configuration or create default if not exists
     */
    async getOrCreateDefault(chapterId: number): Promise<QuizConfig> {
        const config = await this.findByChapterIdOrNull(chapterId);
        if (config) {
            return config;
        }
        return this.createDefaultConfig(chapterId);
    }

    /**
     * Convert entity to response DTO
     */
    toResponseDto(config: QuizConfig): QuizConfigResponseDto {
        return {
            id: config.id,
            chapter_id: config.chapter_id,
            title: config.title,
            description: config.description,
            questions_per_quiz: config.questions_per_quiz,
            time_limit_minutes: config.time_limit_minutes,
            passing_score_percentage: config.passing_score_percentage,
            easy_percentage: config.easy_percentage,
            medium_percentage: config.medium_percentage,
            hard_percentage: config.hard_percentage,
            is_active: config.is_active,
            shuffle_questions: config.shuffle_questions,
            shuffle_options: config.shuffle_options,
            show_results_immediately: config.show_results_immediately,
            max_attempts: config.max_attempts,
            created_at: config.created_at,
            updated_at: config.updated_at,
        };
    }
}
