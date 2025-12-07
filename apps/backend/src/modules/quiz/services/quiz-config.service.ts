import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizChapterConfig } from '../entities/quiz-chapter-config.entity';
import { CreateQuizConfigDto } from '../dtos/create-quiz-config.dto';

@Injectable()
export class QuizConfigService {
    constructor(
        @InjectRepository(QuizChapterConfig)
        private readonly configRepository: Repository<QuizChapterConfig>,
    ) { }

    async create(chapterId: number, createDto: CreateQuizConfigDto): Promise<QuizChapterConfig> {
        // Check if config already exists for this chapter
        const existing = await this.configRepository.findOne({ where: { chapter_id: chapterId } });
        if (existing) {
            throw new ConflictException(`Quiz config already exists for chapter ${chapterId}`);
        }

        const config = this.configRepository.create({
            chapter_id: chapterId,
            ...createDto,
        });

        return this.configRepository.save(config);
    }

    async findByChapterId(chapterId: number): Promise<QuizChapterConfig> {
        const config = await this.configRepository.findOne({ where: { chapter_id: chapterId } });
        if (!config) {
            throw new NotFoundException(`Quiz config not found for chapter ${chapterId}`);
        }
        return config;
    }

    async update(chapterId: number, updateDto: Partial<CreateQuizConfigDto>): Promise<QuizChapterConfig> {
        const config = await this.findByChapterId(chapterId);
        Object.assign(config, updateDto);
        return this.configRepository.save(config);
    }

    async delete(chapterId: number): Promise<void> {
        const config = await this.findByChapterId(chapterId);
        await this.configRepository.remove(config);
    }
}
