import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
import { User } from '../users/entities/user.entity';
import { BookProcessingService } from './book-processing.service';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    private readonly bookProcessingService: BookProcessingService,
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

  async findAll(): Promise<Book[]> {
    return this.bookRepository.find({
      relations: ['cover_file', 'file'],
    });
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['cover_file', 'file', 'chapters'],
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return book;
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);

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
}
