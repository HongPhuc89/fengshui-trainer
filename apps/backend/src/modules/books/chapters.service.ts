import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';
import { BooksService } from './books.service';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    private readonly booksService: BooksService,
  ) {}

  async create(bookId: number, createChapterDto: CreateChapterDto): Promise<Chapter> {
    // Verify that the book exists (use admin method to allow any status)
    await this.booksService.findOneAdmin(bookId);

    // Auto-assign order if not provided
    if (createChapterDto.order === undefined) {
      const maxOrder = await this.chapterRepository
        .createQueryBuilder('chapter')
        .where('chapter.book_id = :bookId', { bookId })
        .select('MAX(chapter.order)', 'max')
        .getRawOne();

      createChapterDto.order = (maxOrder?.max ?? 0) + 1;
    }

    const chapter = this.chapterRepository.create({
      ...createChapterDto,
      book_id: bookId,
    });

    const savedChapter = await this.chapterRepository.save(chapter);

    // Update book chapter_count
    await this.booksService.incrementChapterCount(bookId);

    return savedChapter;
  }

  async findAllByBook(bookId: number): Promise<Chapter[]> {
    return this.chapterRepository.find({
      where: { book_id: bookId },
      order: { order: 'ASC' },
    });
  }

  async findAllByPublishedBook(bookId: number): Promise<Chapter[]> {
    // Verify the book is published
    await this.booksService.findOne(bookId); // This only returns published books

    return this.findAllByBook(bookId);
  }

  async findOne(bookId: number, chapterId: number): Promise<Chapter> {
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId, book_id: bookId },
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found in book ${bookId}`);
    }

    return chapter;
  }

  async findOneInPublishedBook(bookId: number, chapterId: number): Promise<Chapter> {
    // Verify the book is published
    await this.booksService.findOne(bookId);

    return this.findOne(bookId, chapterId);
  }

  async update(bookId: number, chapterId: number, updateChapterDto: UpdateChapterDto): Promise<Chapter> {
    const chapter = await this.findOne(bookId, chapterId);

    Object.assign(chapter, updateChapterDto);

    return this.chapterRepository.save(chapter);
  }

  async delete(bookId: number, chapterId: number): Promise<void> {
    const chapter = await this.findOne(bookId, chapterId);

    await this.chapterRepository.remove(chapter);

    // Decrement book chapter_count
    await this.booksService.decrementChapterCount(bookId);
  }
}
