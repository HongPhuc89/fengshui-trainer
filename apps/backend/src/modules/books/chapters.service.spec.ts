import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChaptersService } from './chapters.service';
import { Chapter } from './entities/chapter.entity';
import { BooksService } from './books.service';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';

describe('ChaptersService', () => {
  let service: ChaptersService;
  let repository: jest.Mocked<Repository<Chapter>>;
  let booksService: jest.Mocked<BooksService>;

  const mockChapter: Chapter = {
    id: 1,
    title: 'Test Chapter',
    content: 'Test Content',
    order: 1,
    book_id: 1,
    created_at: new Date(),
    updated_at: new Date(),
    book: null,
    flashcards: [],
    questions: [],
    mindMap: null,
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChaptersService,
        {
          provide: getRepositoryToken(Chapter),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: BooksService,
          useValue: {
            findOneAdmin: jest.fn(),
            findOne: jest.fn(),
            incrementChapterCount: jest.fn(),
            decrementChapterCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChaptersService>(ChaptersService);
    repository = module.get(getRepositoryToken(Chapter));
    booksService = module.get(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createChapterDto: CreateChapterDto = {
      title: 'New Chapter',
      content: 'New Content',
      order: 1,
    };

    it('should create a chapter successfully', async () => {
      booksService.findOneAdmin.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockChapter as any);
      repository.save.mockResolvedValue(mockChapter);
      booksService.incrementChapterCount.mockResolvedValue(undefined);

      const result = await service.create(1, createChapterDto);

      expect(result).toEqual(mockChapter);
      expect(booksService.findOneAdmin).toHaveBeenCalledWith(1);
      expect(repository.create).toHaveBeenCalledWith({
        ...createChapterDto,
        book_id: 1,
      });
      expect(booksService.incrementChapterCount).toHaveBeenCalledWith(1);
    });

    it('should auto-assign order when not provided', async () => {
      const dtoWithoutOrder = { title: 'New Chapter', content: 'New Content' };
      booksService.findOneAdmin.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockChapter as any);
      repository.save.mockResolvedValue(mockChapter);
      booksService.incrementChapterCount.mockResolvedValue(undefined);

      await service.create(1, dtoWithoutOrder);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findAllByBook', () => {
    it('should return all chapters for a book', async () => {
      const chapters = [mockChapter];
      repository.find.mockResolvedValue(chapters);

      const result = await service.findAllByBook(1);

      expect(result).toEqual(chapters);
      expect(repository.find).toHaveBeenCalledWith({
        where: { book_id: 1 },
        order: { order: 'ASC' },
      });
    });
  });

  describe('findAllByPublishedBook', () => {
    it('should return chapters for a published book', async () => {
      const chapters = [mockChapter];
      booksService.findOne.mockResolvedValue({} as any);
      repository.find.mockResolvedValue(chapters);

      const result = await service.findAllByPublishedBook(1);

      expect(result).toEqual(chapters);
      expect(booksService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('should return a chapter by id', async () => {
      repository.findOne.mockResolvedValue(mockChapter);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockChapter);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, book_id: 1 },
      });
    });

    it('should throw NotFoundException when chapter not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneInPublishedBook', () => {
    it('should return a chapter from a published book', async () => {
      booksService.findOne.mockResolvedValue({} as any);
      repository.findOne.mockResolvedValue(mockChapter);

      const result = await service.findOneInPublishedBook(1, 1);

      expect(result).toEqual(mockChapter);
      expect(booksService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    const updateChapterDto: UpdateChapterDto = {
      title: 'Updated Title',
      content: 'Updated Content',
    };

    it('should update a chapter successfully', async () => {
      const updatedChapter = { ...mockChapter, ...updateChapterDto };
      repository.findOne.mockResolvedValue(mockChapter);
      repository.save.mockResolvedValue(updatedChapter);

      const result = await service.update(1, 1, updateChapterDto);

      expect(result).toEqual(updatedChapter);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a chapter successfully', async () => {
      repository.findOne.mockResolvedValue(mockChapter);
      repository.remove.mockResolvedValue(mockChapter);
      booksService.decrementChapterCount.mockResolvedValue(undefined);

      await service.delete(1, 1);

      expect(repository.remove).toHaveBeenCalledWith(mockChapter);
      expect(booksService.decrementChapterCount).toHaveBeenCalledWith(1);
    });
  });
});
