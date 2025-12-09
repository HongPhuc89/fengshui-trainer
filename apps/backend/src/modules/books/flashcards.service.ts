import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flashcard } from './entities/flashcard.entity';
import { CreateFlashcardDto } from './dtos/create-flashcard.dto';
import { UpdateFlashcardDto } from './dtos/update-flashcard.dto';
import { ChaptersService } from './chapters.service';
import * as Papa from 'papaparse';
import { ImportFlashcardsOptionsDto } from './dtos/import-flashcards-options.dto';

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: string[];
}

interface CSVRow {
  question: string;
  answer: string;
}

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectRepository(Flashcard)
    private readonly flashcardRepository: Repository<Flashcard>,
    private readonly chaptersService: ChaptersService,
  ) {}

  async create(bookId: number, chapterId: number, createFlashcardDto: CreateFlashcardDto): Promise<Flashcard> {
    // Verify that the chapter exists
    await this.chaptersService.findOne(bookId, chapterId);

    const flashcard = this.flashcardRepository.create({
      ...createFlashcardDto,
      chapter_id: chapterId,
    });

    try {
      return await this.flashcardRepository.save(flashcard);
    } catch (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        // PostgreSQL unique violation error code
        throw new BadRequestException('Flashcard with this question and answer already exists in this chapter');
      }
      throw error;
    }
  }

  /**
   * Export flashcards to CSV
   */
  async exportToCSV(bookId: number, chapterId: number): Promise<string> {
    // Verify chapter exists
    await this.chaptersService.findOne(bookId, chapterId);

    const flashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
      order: { created_at: 'ASC' },
    });

    const csvData = flashcards.map((fc) => ({
      question: fc.question,
      answer: fc.answer,
    }));

    return Papa.unparse(csvData, {
      quotes: true,
      header: true,
    });
  }

  /**
   * Preview CSV import
   */
  async previewImport(bookId: number, chapterId: number, csvContent: string) {
    // Verify chapter exists
    await this.chaptersService.findOne(bookId, chapterId);

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const validRows = [];
    const warnings = [];
    const errors = [];

    // Get existing questions for duplicate check
    const existingFlashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
      select: ['question'],
    });
    const existingQuestions = new Set(existingFlashcards.map((fc) => fc.question.toLowerCase().trim()));

    parseResult.data.forEach((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and row 1 is header

      // Validation
      if (!row.question || !row.answer) {
        errors.push({
          row: rowNumber,
          type: 'missing_field',
          field: !row.question ? 'question' : 'answer',
          message: `${!row.question ? 'Question' : 'Answer'} is required`,
        });
        return;
      }

      if (row.question.length > 500) {
        errors.push({
          row: rowNumber,
          type: 'length_exceeded',
          field: 'question',
          message: 'Question exceeds 500 characters',
        });
        return;
      }

      if (row.answer.length > 1000) {
        errors.push({
          row: rowNumber,
          type: 'length_exceeded',
          field: 'answer',
          message: 'Answer exceeds 1000 characters',
        });
        return;
      }

      // Check for duplicates
      if (existingQuestions.has(row.question.toLowerCase().trim())) {
        warnings.push({
          row: rowNumber,
          type: 'duplicate',
          question: row.question,
          message: 'Question already exists in this chapter',
        });
      }

      validRows.push({
        row: rowNumber,
        question: row.question.trim(),
        answer: row.answer.trim(),
        status: 'valid',
      });
    });

    return {
      totalRows: parseResult.data.length,
      validRows: validRows.length,
      warnings,
      errors,
      preview: validRows.slice(0, 10), // Show first 10 for preview
    };
  }

  /**
   * Import flashcards from CSV
   */
  async importFromCSV(
    bookId: number,
    chapterId: number,
    csvContent: string,
    options: ImportFlashcardsOptionsDto = {},
  ): Promise<ImportResult> {
    // Verify chapter exists
    await this.chaptersService.findOne(bookId, chapterId);

    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const flashcardsToCreate = [];
    const skipped = [];
    let imported = 0;
    let duplicates = 0;
    const errors = [];

    // Get existing questions
    const existingFlashcards = await this.flashcardRepository.find({
      where: { chapter_id: chapterId },
    });
    const existingQuestionsMap = new Map(existingFlashcards.map((fc) => [fc.question.toLowerCase().trim(), fc]));

    for (const row of parseResult.data as CSVRow[]) {
      // Skip invalid rows
      if (!row.question || !row.answer) {
        if (options.skipErrors) {
          skipped.push({ reason: 'missing_field', row });
          continue;
        } else {
          errors.push('Missing question or answer');
          continue;
        }
      }

      const questionKey = row.question.toLowerCase().trim();

      // Handle duplicates
      if (existingQuestionsMap.has(questionKey)) {
        if (options.skipDuplicates) {
          duplicates++;
          skipped.push({ reason: 'duplicate', row });
          continue;
        } else if (options.replaceDuplicates) {
          // Update existing flashcard
          const existing = existingQuestionsMap.get(questionKey);
          existing.answer = row.answer.trim();
          await this.flashcardRepository.save(existing);
          imported++;
          continue;
        }
      }

      flashcardsToCreate.push({
        chapter_id: chapterId,
        question: row.question.trim(),
        answer: row.answer.trim(),
      });
    }

    const createdFlashcards = await this.flashcardRepository.save(flashcardsToCreate);
    imported += createdFlashcards.length;

    return {
      total: parseResult.data.length,
      imported,
      duplicates,
      errors,
    };
  }

  /**
   * Generate CSV template
   */
  generateTemplate(): string {
    const template = [
      {
        question: 'What is the capital of France?',
        answer: 'Paris',
      },
      {
        question: 'What is 2 + 2?',
        answer: '4',
      },
      {
        question: 'Who wrote Romeo and Juliet?',
        answer: 'William Shakespeare',
      },
    ];

    return Papa.unparse(template, {
      quotes: true,
      header: true,
    });
  }

  async findAllByChapter(bookId: number, chapterId: number): Promise<Flashcard[]> {
    return this.flashcardRepository.find({
      where: { chapter_id: chapterId },
      order: { created_at: 'ASC' },
    });
  }

  async findAllByPublishedChapter(bookId: number, chapterId: number): Promise<Flashcard[]> {
    // Verify the chapter belongs to a published book
    await this.chaptersService.findOneInPublishedBook(bookId, chapterId);

    return this.findAllByChapter(bookId, chapterId);
  }

  async getRandomFlashcards(bookId: number, chapterId: number, count: number = 5): Promise<Flashcard[]> {
    // Verify the chapter belongs to a published book
    await this.chaptersService.findOneInPublishedBook(bookId, chapterId);

    // Get all flashcards for the chapter
    const allFlashcards = await this.findAllByChapter(bookId, chapterId);

    // Shuffle and return requested count
    const shuffled = this.shuffleArray(allFlashcards);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async findOne(bookId: number, chapterId: number, flashcardId: number): Promise<Flashcard> {
    const flashcard = await this.flashcardRepository.findOne({
      where: { id: flashcardId, chapter_id: chapterId },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard with ID ${flashcardId} not found in chapter ${chapterId}`);
    }

    return flashcard;
  }

  async findOneInPublishedChapter(bookId: number, chapterId: number, flashcardId: number): Promise<Flashcard> {
    // Verify the chapter belongs to a published book
    await this.chaptersService.findOneInPublishedBook(bookId, chapterId);

    return this.findOne(bookId, chapterId, flashcardId);
  }

  async update(
    bookId: number,
    chapterId: number,
    flashcardId: number,
    updateFlashcardDto: UpdateFlashcardDto,
  ): Promise<Flashcard> {
    const flashcard = await this.findOne(bookId, chapterId, flashcardId);

    Object.assign(flashcard, updateFlashcardDto);

    try {
      return await this.flashcardRepository.save(flashcard);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Flashcard with this question and answer already exists in this chapter');
      }
      throw error;
    }
  }

  async delete(bookId: number, chapterId: number, flashcardId: number): Promise<void> {
    const flashcard = await this.findOne(bookId, chapterId, flashcardId);
    await this.flashcardRepository.remove(flashcard);
  }
}
