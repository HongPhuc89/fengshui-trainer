import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChaptersService } from './chapters.service';
import { Chapter } from './entities/chapter.entity';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { UploadService } from '../upload/upload.service';
import { BooksService } from './books.service';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';
import { QuizConfigService } from '../quiz/services/quiz-config.service';
import { FileType } from '../../shares/enums/file-type.enum';

describe('ChaptersService', () => {
  let service: ChaptersService;
  let repository: jest.Mocked<Repository<Chapter>>;
  let uploadedFileRepository: jest.Mocked<Repository<UploadedFile>>;
  let uploadService: jest.Mocked<UploadService>;
  let booksService: jest.Mocked<BooksService>;
  let quizConfigService: jest.Mocked<QuizConfigService>;

  const mockChapter: Chapter = {
    id: 1,
    title: 'Test Chapter',
    content: 'Test Content',
    order: 1,
    points: 100,
    book_id: 1,
    file_id: null,
    file: null,
    created_at: new Date(),
    updated_at: new Date(),
    book: null,
  } as Chapter;

  const mockUploadedFile: UploadedFile = {
    id: 1,
    user_id: 1,
    type: FileType.CHAPTER,
    original_name: 'test.pdf',
    filename: 'uuid.pdf',
    path: 'https://storage.supabase.co/chapters/uuid.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    created_at: new Date(),
    updated_at: new Date(),
  } as UploadedFile;

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
          provide: getRepositoryToken(UploadedFile),
          useValue: {
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UploadService,
          useValue: {
            extractPathFromUrl: jest.fn(),
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
        {
          provide: QuizConfigService,
          useValue: {
            createDefaultConfig: jest.fn(),
            getOrCreateDefault: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChaptersService>(ChaptersService);
    repository = module.get(getRepositoryToken(Chapter));
    uploadedFileRepository = module.get(getRepositoryToken(UploadedFile));
    uploadService = module.get(UploadService);
    booksService = module.get(BooksService);
    quizConfigService = module.get(QuizConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createChapterDto: CreateChapterDto = {
      title: 'New Chapter',
      content: 'New Content',
      order: 1,
      points: 100,
    };

    it('should create a chapter successfully', async () => {
      booksService.findOneAdmin.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockChapter as any);
      repository.save.mockResolvedValue(mockChapter as any);
      booksService.incrementChapterCount.mockResolvedValue(undefined);
      quizConfigService.createDefaultConfig.mockResolvedValue({} as any);

      const result = await service.create(1, createChapterDto);

      expect(result).toEqual(mockChapter);
      expect(booksService.findOneAdmin).toHaveBeenCalledWith(1);
      expect(repository.create).toHaveBeenCalledWith({
        ...createChapterDto,
        book_id: 1,
      });
      expect(booksService.incrementChapterCount).toHaveBeenCalledWith(1);
    });

    it('should create a chapter with file_id', async () => {
      const dtoWithFile = { ...createChapterDto, file_id: 1 };
      const chapterWithFile = { ...mockChapter, file_id: 1 };

      booksService.findOneAdmin.mockResolvedValue({} as any);
      uploadedFileRepository.findOne.mockResolvedValue(mockUploadedFile as any);
      repository.create.mockReturnValue(chapterWithFile as any);
      repository.save.mockResolvedValue(chapterWithFile as any);
      booksService.incrementChapterCount.mockResolvedValue(undefined);
      quizConfigService.createDefaultConfig.mockResolvedValue({} as any);

      const result = await service.create(1, dtoWithFile);

      expect(result.file_id).toBe(1);
      expect(uploadedFileRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw BadRequestException when file_id does not exist', async () => {
      const dtoWithFile = { ...createChapterDto, file_id: 999 };

      booksService.findOneAdmin.mockResolvedValue({} as any);
      uploadedFileRepository.findOne.mockResolvedValue(null);

      await expect(service.create(1, dtoWithFile)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, dtoWithFile)).rejects.toThrow('File with ID 999 not found');
    });

    it('should throw BadRequestException when file type is not chapter', async () => {
      const dtoWithFile = { ...createChapterDto, file_id: 1 };
      const wrongTypeFile = { ...mockUploadedFile, type: FileType.BOOK };

      booksService.findOneAdmin.mockResolvedValue({} as any);
      uploadedFileRepository.findOne.mockResolvedValue(wrongTypeFile as any);

      await expect(service.create(1, dtoWithFile)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, dtoWithFile)).rejects.toThrow('is not a chapter file');
    });

    it('should auto-assign order when not provided', async () => {
      const dtoWithoutOrder = { title: 'New Chapter', content: 'New Content', points: 100 };
      booksService.findOneAdmin.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockChapter as any);
      repository.save.mockResolvedValue(mockChapter as any);
      booksService.incrementChapterCount.mockResolvedValue(undefined);
      quizConfigService.createDefaultConfig.mockResolvedValue({} as any);

      await service.create(1, dtoWithoutOrder);

      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('findAllByBook', () => {
    it('should return all chapters with file relation', async () => {
      const chapters = [mockChapter];
      repository.find.mockResolvedValue(chapters);

      const result = await service.findAllByBook(1);

      expect(result).toEqual(chapters);
      expect(repository.find).toHaveBeenCalledWith({
        where: { book_id: 1 },
        relations: ['file'],
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
    it('should return a chapter with file relation', async () => {
      repository.findOne.mockResolvedValue(mockChapter);

      const result = await service.findOne(1, 1);

      expect(result).toEqual(mockChapter);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, book_id: 1 },
        relations: ['file'],
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
      repository.save.mockResolvedValue(updatedChapter as any);

      const result = await service.update(1, 1, updateChapterDto);

      expect(result).toEqual(updatedChapter);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should update chapter with new file_id', async () => {
      const updateDto = { file_id: 2 };
      const chapterWithFile = { ...mockChapter, file_id: 1 };
      const updatedChapter = { ...mockChapter, file_id: 2 };

      repository.findOne.mockResolvedValue(chapterWithFile as any);
      uploadedFileRepository.findOne
        .mockResolvedValueOnce(mockUploadedFile) // old file
        .mockResolvedValueOnce({ ...mockUploadedFile, id: 2 } as any); // new file
      uploadService.extractPathFromUrl.mockReturnValue('chapters/uuid.pdf');
      repository.save.mockResolvedValue(updatedChapter as any);

      const result = await service.update(1, 1, updateDto);

      expect(result.file_id).toBe(2);
      expect(uploadedFileRepository.remove).toHaveBeenCalled();
    });

    it('should remove file when file_id is set to null', async () => {
      const updateDto = { file_id: null };
      const chapterWithFile = { ...mockChapter, file_id: 1 };
      const updatedChapter = { ...mockChapter, file_id: null };

      repository.findOne.mockResolvedValue(chapterWithFile as any);
      uploadedFileRepository.findOne.mockResolvedValue(mockUploadedFile as any);
      uploadService.extractPathFromUrl.mockReturnValue('chapters/uuid.pdf');
      repository.save.mockResolvedValue(updatedChapter as any);

      const result = await service.update(1, 1, updateDto);

      expect(result.file_id).toBeNull();
      expect(uploadedFileRepository.remove).toHaveBeenCalled();
    });

    it('should validate new file_id', async () => {
      const updateDto = { file_id: 999 };

      repository.findOne.mockResolvedValue(mockChapter);
      uploadedFileRepository.findOne.mockResolvedValue(null);

      await expect(service.update(1, 1, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a chapter without file', async () => {
      repository.findOne.mockResolvedValue(mockChapter);
      repository.remove.mockResolvedValue(mockChapter as any);
      booksService.decrementChapterCount.mockResolvedValue(undefined);

      await service.delete(1, 1);

      expect(repository.remove).toHaveBeenCalledWith(mockChapter);
      expect(booksService.decrementChapterCount).toHaveBeenCalledWith(1);
    });

    it('should delete a chapter with file', async () => {
      const chapterWithFile = { ...mockChapter, file_id: 1 };

      repository.findOne.mockResolvedValue(chapterWithFile as any);
      uploadedFileRepository.findOne.mockResolvedValue(mockUploadedFile as any);
      uploadService.extractPathFromUrl.mockReturnValue('chapters/uuid.pdf');
      repository.remove.mockResolvedValue(chapterWithFile as any);
      booksService.decrementChapterCount.mockResolvedValue(undefined);

      await service.delete(1, 1);

      expect(uploadedFileRepository.remove).toHaveBeenCalledWith(mockUploadedFile);
      expect(repository.remove).toHaveBeenCalledWith(chapterWithFile);
      expect(booksService.decrementChapterCount).toHaveBeenCalledWith(1);
    });
  });
});
