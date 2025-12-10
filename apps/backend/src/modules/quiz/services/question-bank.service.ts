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
  ) {}

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

  async findAllByChapterPaginated(chapterId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [questions, total] = await this.questionRepository.findAndCount({
      where: { chapter_id: chapterId },
      order: { difficulty: 'ASC', created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: questions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async exportToCSV(chapterId: number): Promise<string> {
    const questions = await this.findAllByChapter(chapterId);

    // CSV Header
    const headers = ['question_type', 'difficulty', 'question_text', 'points', 'options', 'explanation'];
    const rows = [headers.join(',')];

    // CSV Rows
    for (const q of questions) {
      const row = [
        q.question_type,
        q.difficulty,
        `"${q.question_text.replace(/"/g, '""')}"`,
        q.points.toString(),
        `"${JSON.stringify(q.options).replace(/"/g, '""')}"`,
        q.explanation ? `"${q.explanation.replace(/"/g, '""')}"` : '',
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  async importFromCSV(chapterId: number, csvContent: string): Promise<{ success: number; errors: string[] }> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return { success: 0, errors: ['CSV file is empty or invalid'] };
    }

    const errors: string[] = [];
    let successCount = 0;

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseCSVLine(lines[i]);
        if (row.length < 4) {
          errors.push(`Line ${i + 1}: Insufficient columns`);
          continue;
        }

        const [questionType, difficulty, questionText, pointsStr, optionsStr, explanation] = row;

        const points = parseInt(pointsStr, 10);
        if (isNaN(points)) {
          errors.push(`Line ${i + 1}: Invalid points value`);
          continue;
        }

        let options: any;
        try {
          options = JSON.parse(optionsStr);
        } catch (e) {
          errors.push(`Line ${i + 1}: Invalid JSON in options`);
          continue;
        }

        await this.create(chapterId, {
          question_type: questionType as any,
          difficulty: difficulty as any,
          question_text: questionText,
          points,
          options,
          explanation: explanation || undefined,
        });

        successCount++;
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    return { success: successCount, errors };
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }
}
