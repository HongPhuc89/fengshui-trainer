import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
import { User } from '../users/entities/user.entity';
import { BookProcessingService } from './book-processing.service';
import { BookStatus } from '../../shares/enums/book-status.enum';
import { UploadService } from '../upload/upload.service';
import { FileType } from '../../shares/enums/file-type.enum';
import { MediaUrlHelper } from '../../shares/helpers/media-url.helper';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly bookProcessingService: BookProcessingService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
    private readonly mediaUrlHelper: MediaUrlHelper,
  ) {}

  async create(createBookDto: CreateBookDto, user: User): Promise<Book> {
    const book = this.bookRepository.create({
      ...createBookDto,
      user_id: user.id,
    });

    const savedBook = await this.bookRepository.save(book);

    if (savedBook.file_id) {
      // Trigger processing asynchronously
      this.bookProcessingService.processBook(savedBook.id).catch((err) => {
        console.error('Failed to process book:', err);
      });
    }

    return savedBook;
  }

  // User-facing methods (published books only)
  async findAll(baseUrl?: string): Promise<Book[]> {
    const books = await this.bookRepository.find({
      where: { status: BookStatus.PUBLISHED },
      relations: ['cover_file', 'file', 'chapters'],
    });

    // Batch process signed URLs for better performance
    const booksWithUrls = await Promise.all(
      books.map(async (book) => {
        // Compute actual chapter count from database
        book.chapter_count = book.chapters?.length || 0;
        return this.attachSignedUrls(book, baseUrl);
      }),
    );

    return booksWithUrls;
  }

  async findOne(id: number, baseUrl?: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id, status: BookStatus.PUBLISHED },
      relations: ['cover_file', 'file', 'chapters'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return this.attachSignedUrls(book, baseUrl);
  }

  // Admin methods (all statuses)
  async findAllAdmin(baseUrl?: string): Promise<Book[]> {
    const books = await this.bookRepository.find({
      relations: ['cover_file', 'file', 'chapters'],
    });

    // Attach signed URLs and compute chapter count
    return Promise.all(
      books.map(async (book) => {
        // Compute actual chapter count from database
        book.chapter_count = book.chapters?.length || 0;
        return this.attachSignedUrls(book, baseUrl);
      }),
    );
  }

  async findOneAdmin(id: number, baseUrl?: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['cover_file', 'file', 'chapters'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return this.attachSignedUrls(book, baseUrl);
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOneAdmin(id); // Use findOneAdmin to allow updating any status

    const oldFileId = book.file_id;

    Object.assign(book, updateBookDto);

    const savedBook = await this.bookRepository.save(book);

    // If file_id changed, re-process
    if (updateBookDto.file_id && updateBookDto.file_id !== oldFileId) {
      this.bookProcessingService.processBook(savedBook.id).catch((err) => {
        console.error('Failed to re-process book:', err);
      });
    }

    return savedBook;
  }

  async incrementChapterCount(bookId: number): Promise<void> {
    await this.bookRepository.increment({ id: bookId }, 'chapter_count', 1);
  }

  async decrementChapterCount(bookId: number): Promise<void> {
    await this.bookRepository.decrement({ id: bookId }, 'chapter_count', 1);
  }

  /**
   * Generate media proxy URLs for book cover and file
   */
  private async attachSignedUrls(book: Book, baseUrl?: string): Promise<Book> {
    if (book.cover_file) {
      this.mediaUrlHelper.attachMediaUrl(book.cover_file, baseUrl);
    }

    if (book.file) {
      this.mediaUrlHelper.attachMediaUrl(book.file, baseUrl);
    }

    return book;
  }

  /**
   * Upload book cover image
   */
  async uploadCover(id: number, file: Express.Multer.File, user: User): Promise<{ cover_url: string }> {
    // Check if book exists
    const book = await this.findOneAdmin(id);

    // Upload file to storage and create uploaded_file record
    const uploadedFile = await this.uploadService.uploadFile(file, FileType.COVER, user);

    // Update book with new cover file ID using update query
    await this.bookRepository.update(id, {
      cover_file_id: uploadedFile.id,
    });

    return { cover_url: uploadedFile.path };
  }
}
