import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { BookProcessingService } from './book-processing.service';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
import { BookStatus } from '../../shares/enums/book-status.enum';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shares/enums/user-role.enum';

describe('BooksService', () => {
  let service: BooksService;
  let repository: jest.Mocked<Repository<Book>>;
  let bookProcessingService: jest.Mocked<BookProcessingService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    role: UserRole.ADMIN,
    refresh_token: null,
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  const mockBook: Book = {
    id: 1,
    title: 'Test Book',
    author: 'Test Author',
    cover_file_id: null,
    file_id: null,
    user_id: 1,
    status: BookStatus.PUBLISHED,
    chapter_count: 0,
    created_at: new Date(),
    updated_at: new Date(),
    user: mockUser,
    cover_file: null,
    file: null,
    chapters: [],
  } as Book;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: getRepositoryToken(Book),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
          },
        },
        {
          provide: BookProcessingService,
          useValue: {
            processBook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
    repository = module.get(getRepositoryToken(Book));
    bookProcessingService = module.get(BookProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBookDto: CreateBookDto = {
      title: 'New Book',
      author: 'New Author',
      cover_file_id: null,
      file_id: 1,
    };

    it('should create a book successfully', async () => {
      const createdBook = { ...mockBook, ...createBookDto };
      repository.create.mockReturnValue(createdBook as any);
      repository.save.mockResolvedValue(createdBook as any);
      bookProcessingService.processBook.mockResolvedValue(undefined);

      const result = await service.create(createBookDto, mockUser);

      expect(result).toEqual(createdBook);
      expect(repository.create).toHaveBeenCalledWith({
        ...createBookDto,
        user_id: mockUser.id,
      });
      expect(repository.save).toHaveBeenCalledWith(createdBook);
    });

    it('should trigger book processing when file_id is provided', async () => {
      const createdBook = { ...mockBook, ...createBookDto, file_id: 1 };
      repository.create.mockReturnValue(createdBook as any);
      repository.save.mockResolvedValue(createdBook as any);
      bookProcessingService.processBook.mockResolvedValue(undefined);

      await service.create(createBookDto, mockUser);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(bookProcessingService.processBook).toHaveBeenCalledWith(createdBook.id);
    });

    it('should not trigger processing when file_id is null', async () => {
      const createDtoWithoutFile = { ...createBookDto, file_id: null };
      const createdBook = { ...mockBook, ...createDtoWithoutFile };
      repository.create.mockReturnValue(createdBook as any);
      repository.save.mockResolvedValue(createdBook as any);

      await service.create(createDtoWithoutFile, mockUser);

      expect(bookProcessingService.processBook).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return only published books', async () => {
      const publishedBooks = [mockBook];
      repository.find.mockResolvedValue(publishedBooks);

      const result = await service.findAll();

      expect(result).toEqual(publishedBooks);
      expect(repository.find).toHaveBeenCalledWith({
        where: { status: BookStatus.PUBLISHED },
        relations: ['cover_file', 'file'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a published book by id', async () => {
      repository.findOne.mockResolvedValue(mockBook);

      const result = await service.findOne(1);

      expect(result).toEqual(mockBook);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, status: BookStatus.PUBLISHED },
        relations: ['cover_file', 'file', 'chapters'],
      });
    });

    it('should throw NotFoundException when book not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllAdmin', () => {
    it('should return all books regardless of status', async () => {
      const allBooks = [mockBook, { ...mockBook, id: 2, status: BookStatus.DRAFT }];
      repository.find.mockResolvedValue(allBooks);

      const result = await service.findAllAdmin();

      expect(result).toEqual(allBooks);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['cover_file', 'file'],
      });
    });
  });

  describe('findOneAdmin', () => {
    it('should return a book by id regardless of status', async () => {
      const draftBook = { ...mockBook, status: BookStatus.DRAFT };
      repository.findOne.mockResolvedValue(draftBook);

      const result = await service.findOneAdmin(1);

      expect(result).toEqual(draftBook);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['cover_file', 'file', 'chapters'],
      });
    });

    it('should throw NotFoundException when book not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOneAdmin(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateBookDto: UpdateBookDto = {
      title: 'Updated Title',
      author: 'Updated Author',
    };

    it('should update a book successfully', async () => {
      const updatedBook = { ...mockBook, ...updateBookDto };
      repository.findOne.mockResolvedValue(mockBook);
      repository.save.mockResolvedValue(updatedBook as any);

      const result = await service.update(1, updateBookDto);

      expect(result).toEqual(updatedBook);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should trigger re-processing when file_id changes', async () => {
      const updateDtoWithFile: UpdateBookDto = {
        ...updateBookDto,
        file_id: 2,
      };
      const updatedBook = { ...mockBook, ...updateDtoWithFile, file_id: 2 };
      repository.findOne.mockResolvedValue({ ...mockBook, file_id: 1 });
      repository.save.mockResolvedValue(updatedBook as any);
      bookProcessingService.processBook.mockResolvedValue(undefined);

      await service.update(1, updateDtoWithFile);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(bookProcessingService.processBook).toHaveBeenCalledWith(updatedBook.id);
    });

    it('should not trigger re-processing when file_id unchanged', async () => {
      repository.findOne.mockResolvedValue(mockBook);
      repository.save.mockResolvedValue({ ...mockBook, ...updateBookDto } as any);

      await service.update(1, updateBookDto);

      expect(bookProcessingService.processBook).not.toHaveBeenCalled();
    });
  });

  describe('incrementChapterCount', () => {
    it('should increment chapter count', async () => {
      repository.increment.mockResolvedValue(undefined);

      await service.incrementChapterCount(1);

      expect(repository.increment).toHaveBeenCalledWith({ id: 1 }, 'chapter_count', 1);
    });
  });

  describe('decrementChapterCount', () => {
    it('should decrement chapter count', async () => {
      repository.decrement.mockResolvedValue(undefined);

      await service.decrementChapterCount(1);

      expect(repository.decrement).toHaveBeenCalledWith({ id: 1 }, 'chapter_count', 1);
    });
  });
});
