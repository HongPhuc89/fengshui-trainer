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
  ) {}

  async create(bookId: number, createChapterDto: CreateChapterDto): Promise<Chapter> {
    // Verify that the book exists (use admin method to allow any status)
    await this.booksService.findOneAdmin(bookId);

    // Validate file_id if provided
    if (createChapterDto.file_id) {
      await this.validateFileId(createChapterDto.file_id, FileType.CHAPTER);
    }

    // Validate infographic_file_id if provided
    if (createChapterDto.infographic_file_id) {
      await this.validateFileId(createChapterDto.infographic_file_id, FileType.INFOGRAPHIC);
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

  async findAllByBook(bookId: number, baseUrl?: string): Promise<Chapter[]> {
    const chapters = await this.chapterRepository.find({
      where: { book_id: bookId },
      relations: ['file', 'infographic_file'],
      order: { order: 'ASC' },
    });

    // Generate media URLs for all chapters
    return Promise.all(
      chapters.map(async (chapter) => {
        if (chapter.file) {
          chapter.file.path = await this.uploadService.getFileUrl(chapter.file, baseUrl);
        }
        if (chapter.infographic_file) {
          chapter.infographic_file.path = await this.uploadService.getFileUrl(chapter.infographic_file, baseUrl);
        }
        return chapter;
      }),
    );
  }

  async findAllByPublishedBook(bookId: number, baseUrl?: string): Promise<Chapter[]> {
    // Verify the book is published
    await this.booksService.findOne(bookId, baseUrl); // This only returns published books

    return this.findAllByBook(bookId, baseUrl);
  }

  async findOne(bookId: number, chapterId: number, baseUrl?: string): Promise<Chapter> {
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId, book_id: bookId },
      relations: ['file', 'infographic_file'],
    });

    console.log(`[ChaptersService] findOne(${chapterId}):`, {
      hasFile: !!chapter?.file,
      hasInfographic: !!chapter?.infographic_file,
      infographicFileId: chapter?.infographic_file_id,
      infographicFile: chapter?.infographic_file
        ? {
            id: chapter.infographic_file.id,
            original_name: chapter.infographic_file.original_name,
            path: chapter.infographic_file.path,
          }
        : null,
    });

    if (!chapter) {
      throw new NotFoundException(`Chapter with ID ${chapterId} not found in book ${bookId}`);
    }

    // Generate fresh signed URL for file if exists
    if (chapter.file) {
      const freshUrl = await this.uploadService.getFileUrl(chapter.file, baseUrl);
      if (freshUrl) {
        chapter.file.path = freshUrl;
      }
    }

    if (chapter.infographic_file) {
      const freshUrl = await this.uploadService.getFileUrl(chapter.infographic_file, baseUrl);
      if (freshUrl) {
        chapter.infographic_file.path = freshUrl;
      }
    }

    return chapter;
  }
  async findOneInPublishedBook(bookId: number, chapterId: number, baseUrl?: string): Promise<Chapter> {
    // Verify the book is published
    await this.booksService.findOne(bookId, baseUrl);

    return this.findOne(bookId, chapterId, baseUrl);
  }

  async update(bookId: number, chapterId: number, updateChapterDto: UpdateChapterDto): Promise<Chapter> {
    const chapter = await this.findOne(bookId, chapterId);

    // Validate new file_id if provided
    if (updateChapterDto.file_id !== undefined && updateChapterDto.file_id !== null) {
      await this.validateFileId(updateChapterDto.file_id, FileType.CHAPTER);
    }

    // Validate new infographic_file_id if provided
    if (updateChapterDto.infographic_file_id !== undefined && updateChapterDto.infographic_file_id !== null) {
      await this.validateFileId(updateChapterDto.infographic_file_id, FileType.INFOGRAPHIC);
    }

    // If file_id is being changed, delete the old file
    if (updateChapterDto.file_id !== undefined && chapter.file_id && chapter.file_id !== updateChapterDto.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }

    // If file_id is being set to null, delete the old file
    if (updateChapterDto.file_id === null && chapter.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }

    // If infographic_file_id is being changed, delete the old file
    if (
      updateChapterDto.infographic_file_id !== undefined &&
      chapter.infographic_file_id &&
      chapter.infographic_file_id !== updateChapterDto.infographic_file_id
    ) {
      await this.deleteChapterFile(chapter.infographic_file_id);
    }

    // If infographic_file_id is being set to null, delete the old file
    if (updateChapterDto.infographic_file_id === null && chapter.infographic_file_id) {
      await this.deleteChapterFile(chapter.infographic_file_id);
    }

    Object.assign(chapter, updateChapterDto);

    return this.chapterRepository.save(chapter);
  }

  async delete(bookId: number, chapterId: number): Promise<void> {
    const chapter = await this.findOne(bookId, chapterId);

    // Delete associated files if they exist
    if (chapter.file_id) {
      await this.deleteChapterFile(chapter.file_id);
    }
    if (chapter.infographic_file_id) {
      await this.deleteChapterFile(chapter.infographic_file_id);
    }

    await this.chapterRepository.remove(chapter);

    // Decrement book chapter_count
    await this.booksService.decrementChapterCount(bookId);
  }

  /**
   * Validate that file_id exists and has specified type
   */
  private async validateFileId(fileId: number, expectedType: FileType): Promise<void> {
    const file = await this.uploadedFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new BadRequestException(`File with ID ${fileId} not found`);
    }

    if (file.type !== expectedType) {
      throw new BadRequestException(`File with ID ${fileId} is not a ${expectedType} file (type: ${file.type})`);
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
