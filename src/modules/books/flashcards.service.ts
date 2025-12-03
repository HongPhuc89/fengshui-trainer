import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flashcard } from './entities/flashcard.entity';
import { CreateFlashcardDto } from './dtos/create-flashcard.dto';
import { UpdateFlashcardDto } from './dtos/update-flashcard.dto';
import { ChaptersService } from './chapters.service';

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: string[];
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

  async importFromCSV(bookId: number, chapterId: number, csvContent: string): Promise<ImportResult> {
    // Verify chapter exists
    await this.chaptersService.findOne(bookId, chapterId);

    const result: ImportResult = {
      total: 0,
      imported: 0,
      duplicates: 0,
      errors: [],
    };

    // Parse CSV
    const lines = csvContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);

    if (lines.length === 0) {
      throw new BadRequestException('CSV file is empty');
    }

    // Parse header
    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const questionIndex = header.indexOf('question');
    const answerIndex = header.indexOf('answer');

    if (questionIndex === -1 || answerIndex === -1) {
      throw new BadRequestException('CSV must contain "question" and "answer" columns');
    }

    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      result.total++;

      try {
        // Parse CSV line (simple parser, handles quoted fields)
        const values = this.parseCSVLine(line);

        if (values.length <= Math.max(questionIndex, answerIndex)) {
          result.errors.push(`Line ${i + 1}: Not enough columns`);
          continue;
        }

        const question = values[questionIndex]?.trim();
        const answer = values[answerIndex]?.trim();

        if (!question || !answer) {
          result.errors.push(`Line ${i + 1}: Question or answer is empty`);
          continue;
        }

        const flashcard = this.flashcardRepository.create({
          question,
          answer,
          chapter_id: chapterId,
        });

        await this.flashcardRepository.save(flashcard);
        result.imported++;
      } catch (error) {
        if (error.code === '23505') {
          // Duplicate - skip silently
          result.duplicates++;
        } else {
          result.errors.push(`Line ${i + 1}: ${error.message}`);
        }
      }
    }

    return result;
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
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
