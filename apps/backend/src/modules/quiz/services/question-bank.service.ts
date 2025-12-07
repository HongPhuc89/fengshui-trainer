import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from '../entities/question.entity';
import { CreateQuestionDto } from '../dtos/create-question.dto';

@Injectable()
export class QuestionBankService {
    constructor(
        @InjectRepository(Question)
        private readonly questionRepository: Repository<Question>,
    ) { }

    async create(chapterId: number, createDto: CreateQuestionDto): Promise<Question> {
        const question = this.questionRepository.create({
            chapter_id: chapterId,
            ...createDto,
        });

        return this.questionRepository.save(question);
    }

    async findAllByChapter(chapterId: number): Promise<Question[]> {
        return this.questionRepository.find({
            where: { chapter_id: chapterId },
            order: { difficulty: 'ASC', created_at: 'DESC' },
        });
    }

    async findById(questionId: number): Promise<Question> {
        const question = await this.questionRepository.findOne({ where: { id: questionId } });
        if (!question) {
            throw new NotFoundException(`Question ${questionId} not found`);
        }
        return question;
    }

    async update(questionId: number, updateDto: Partial<CreateQuestionDto>): Promise<Question> {
        const question = await this.findById(questionId);
        Object.assign(question, updateDto);
        return this.questionRepository.save(question);
    }

    async delete(questionId: number): Promise<void> {
        const question = await this.findById(questionId);
        await this.questionRepository.remove(question);
    }

    async findActiveByChapter(chapterId: number): Promise<Question[]> {
        return this.questionRepository.find({
            where: { chapter_id: chapterId, is_active: true },
        });
    }
}
