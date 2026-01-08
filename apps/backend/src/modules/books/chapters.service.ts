import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from './entities/chapter.entity';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';
import { BooksService } from './books.service';
import { QuizConfigService } from '../quiz/services/quiz-config.service';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { UploadService } from '../upload/upload.service';
import { FileType } from '../../shares/enums/file-type.enum';

@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(UploadedFile)
    private readonly uploadedFileRepository: Repository<UploadedFile>,
    private readonly booksService: BooksService,
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => QuizConfigService))
    private readonly quizConfigService: QuizConfigService,
  ) { }

  async create(bookId: number, createChapterDto: CreateChapterDto): Promise<Chapter> {
    // Verify that the book exists (use admin method to allow any status)
    await this.booksService.findOneAdmin(bookId);

    // Validate file_id if provided
    if (createChapterDto.file_id) {
      await this.validateFileId(createChapterDto.file_id);
    }

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

    // Create default quiz configuration for this chapter
    try {
      await this.quizConfigService.createDefaultConfig(savedChapter.id);
    } catch (error) {
      // Log error but don't fail chapter creation
      console.error(`Failed to create default quiz config for chapter ${savedChapter.id}:`, error);
    }

    return savedChapter;
  }

  async findAllByBook(bookId: number): Promise<Chapter[]> {
    return this.chapterRepository.find({
      where: { book_id: bookId },
      relations: ['file'],
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
      relations: ['file'],
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found in book ${bookId}`);
    }

    // Generate fresh signed URL for file if exists
    if (chapter.file) {
      const freshUrl = await this.uploadService.getFileUrl(chapter.file);
      if (freshUrl) {
        chapter.file.path = freshUrl;
      }
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

    // Validate new file_id if provided
    if (updateChapterDto.file_id !== undefined && updateChapterDto.file_id !== null) {
      await this.validateFileId(updateChapterDto.file_id);
    }

    // If file_id is being changed, delete the old file
    if (updateChapterDto.file_id !== undefined && chapter.file_id && chapter.file_id !== updateChapterDto.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }

    // If file_id is being set to null, delete the old file
    if (updateChapterDto.file_id === null && chapter.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }

    Object.assign(chapter, updateChapterDto);

    return this.chapterRepository.save(chapter);
  }

  async delete(bookId: number, chapterId: number): Promise<void> {
    const chapter = await this.findOne(bookId, chapterId);

    // Delete associated file if exists
    if (chapter.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }

    await this.chapterRepository.remove(chapter);

    // Decrement book chapter_count
    await this.booksService.decrementChapterCount(bookId);
  }

  /**
   * Validate that file_id exists and has type 'chapter'
   */
  private async validateFileId(fileId: number): Promise<void> {
    const file = await this.uploadedFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException(`File with ID ${fileId} not found`);
    }

    if (file.type !== FileType.CHAPTER) {
      throw new BadRequestException(`File with ID ${fileId} is not a chapter file (type: ${file.type})`);
    }
  }

  /**
   * Delete chapter file from storage and database
   */
  private async deleteChapterFile(fileId: number): Promise<void> {
    try {
      const file = await this.uploadedFileRepository.findOne({
        where: { id: fileId },
      });

      if (file) {
        // Extract storage path from URL
        const storagePath = this.uploadService.extractPathFromUrl(file.path);

        // Delete from Supabase Storage
        // Note: We need to add a deleteFile method to UploadService
        // For now, we'll just delete from database
        // TODO: Implement deleteFile in UploadService

        // Delete from database
        await this.uploadedFileRepository.remove(file);
      }
    } catch (error) {
      console.error(`Failed to delete file ${fileId}:`, error);
      // Don't throw error to avoid blocking chapter operations
    }
  }
}
