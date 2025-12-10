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

  async findActiveByChapter(chapterId: number): Promise<Question[]> {
    return this.questionRepository.find({
      where: { chapter_id: chapterId, is_active: true },
      order: { created_at: 'DESC' },
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

  async importFromCSV(
    chapterId: number,
    csvContent: string,
  ): Promise<{ success: number; errors: string[]; skipped: number }> {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      return { success: 0, errors: ['CSV file is empty or invalid'], skipped: 0 };
    }

    const errors: string[] = [];
    let successCount = 0;
    let skippedCount = 0;

    // Get existing questions to check for duplicates
    const existingQuestions = await this.findAllByChapter(chapterId);
    const existingTexts = new Set(existingQuestions.map((q) => q.question_text.trim().toLowerCase()));

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = this.parseCSVLine(lines[i]);
        if (row.length < 4) {
          errors.push(`Line ${i + 1}: Insufficient columns`);
          continue;
        }

        const [questionType, difficulty, questionText, pointsStr, optionsStr, explanation] = row;

        // Check for duplicate
        if (existingTexts.has(questionText.trim().toLowerCase())) {
          skippedCount++;
          continue;
        }

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

    return { success: successCount, errors, skipped: skippedCount };
  }

  async clearDuplicates(chapterId: number): Promise<{ removed: number }> {
    const questions = await this.findAllByChapter(chapterId);

    const seen = new Map<string, number>();
    const duplicateIds: number[] = [];

    // Find duplicates based on question_text (case-insensitive)
    for (const question of questions) {
      const key = question.question_text.trim().toLowerCase();
      if (seen.has(key)) {
        // Keep the first one, mark this as duplicate
        duplicateIds.push(question.id);
      } else {
        seen.set(key, question.id);
      }
    }

    // Delete duplicates in bulk (more efficient than loop)
    if (duplicateIds.length > 0) {
      await this.questionRepository.delete(duplicateIds);
    }

    return { removed: duplicateIds.length };
  }

  async cleanQuestions(chapterId: number): Promise<{ cleaned: number }> {
    // Get all questions for this chapter
    const questions = await this.questionRepository.find({
      where: { chapter_id: chapterId },
    });

    let cleanedCount = 0;

    for (const question of questions) {
      const originalText = question.question_text;
      let cleanedText = originalText;

      // Check if there's a colon
      const colonIndex = originalText.indexOf(':');
      if (colonIndex !== -1) {
        // Remove everything before and including the colon, then trim
        cleanedText = originalText.substring(colonIndex + 1).trim();
      } else {
        // Just trim if no colon
        cleanedText = originalText.trim();
      }

      // Only update if text changed
      if (cleanedText !== originalText) {
        question.question_text = cleanedText;
        await this.questionRepository.save(question);
        cleanedCount++;
      }
    }

    return { cleaned: cleanedCount };
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
