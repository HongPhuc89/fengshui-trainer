import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FlashcardsService } from './flashcards.service';
import { Flashcard } from './entities/flashcard.entity';
import { ChaptersService } from './chapters.service';
import { CreateFlashcardDto } from './dtos/create-flashcard.dto';
import { UpdateFlashcardDto } from './dtos/update-flashcard.dto';

describe('FlashcardsService', () => {
  let service: FlashcardsService;
  let repository: jest.Mocked<Repository<Flashcard>>;
  let chaptersService: jest.Mocked<ChaptersService>;

  const mockFlashcard: Flashcard = {
    id: 1,
    question: 'Test Question',
    answer: 'Test Answer',
    chapter_id: 1,
    created_at: new Date(),
    updated_at: new Date(),
    chapter: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        {
          provide: getRepositoryToken(Flashcard),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ChaptersService,
          useValue: {
            findOne: jest.fn(),
            findOneInPublishedBook: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FlashcardsService>(FlashcardsService);
    repository = module.get(getRepositoryToken(Flashcard));
    chaptersService = module.get(ChaptersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createFlashcardDto: CreateFlashcardDto = {
      question: 'New Question',
      answer: 'New Answer',
    };

    it('should create a flashcard successfully', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockFlashcard as any);
      repository.save.mockResolvedValue(mockFlashcard);

      const result = await service.create(1, 1, createFlashcardDto);

      expect(result).toEqual(mockFlashcard);
      expect(chaptersService.findOne).toHaveBeenCalledWith(1, 1);
      expect(repository.create).toHaveBeenCalledWith({
        ...createFlashcardDto,
        chapter_id: 1,
      });
    });

    it('should throw BadRequestException for duplicate flashcard', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockFlashcard as any);
      repository.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(1, 1, createFlashcardDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('importFromCSV', () => {
    const validCSV = `question,answer
"What is 2+2?","4"
"What is the capital of France?","Paris"`;

    it('should import flashcards from CSV successfully', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockFlashcard as any);
      repository.save.mockResolvedValue(mockFlashcard);

      const result = await service.importFromCSV(1, 1, validCSV);

      expect(result.total).toBe(2);
      expect(result.imported).toBe(2);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle duplicates during import', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      repository.create.mockReturnValue(mockFlashcard as any);
      repository.save.mockResolvedValueOnce(mockFlashcard).mockRejectedValueOnce({ code: '23505' });

      const result = await service.importFromCSV(1, 1, validCSV);

      expect(result.total).toBe(2);
      expect(result.imported).toBe(1);
      expect(result.duplicates).toBe(1);
    });

    it('should throw error for empty CSV', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);

      await expect(service.importFromCSV(1, 1, '')).rejects.toThrow(BadRequestException);
    });

    it('should throw error for CSV without required columns', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      const invalidCSV = 'wrong,headers\nvalue1,value2';

      await expect(service.importFromCSV(1, 1, invalidCSV)).rejects.toThrow(BadRequestException);
    });

    it('should handle errors in CSV rows', async () => {
      chaptersService.findOne.mockResolvedValue({} as any);
      const csvWithErrors = `question,answer
"Valid Question","Valid Answer"
"Question Only"`;

      repository.create.mockReturnValue(mockFlashcard as any);
      repository.save.mockResolvedValue(mockFlashcard);

      const result = await service.importFromCSV(1, 1, csvWithErrors);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('findAllByChapter', () => {
    it('should return all flashcards for a chapter', async () => {
      const flashcards = [mockFlashcard];
      repository.find.mockResolvedValue(flashcards);

      const result = await service.findAllByChapter(1, 1);

      expect(result).toEqual(flashcards);
      expect(repository.find).toHaveBeenCalledWith({
        where: { chapter_id: 1 },
        order: { created_at: 'ASC' },
      });
    });
  });

  describe('findAllByPublishedChapter', () => {
    it('should return flashcards for a published chapter', async () => {
      const flashcards = [mockFlashcard];
      chaptersService.findOneInPublishedBook.mockResolvedValue({} as any);
      repository.find.mockResolvedValue(flashcards);

      const result = await service.findAllByPublishedChapter(1, 1);

      expect(result).toEqual(flashcards);
      expect(chaptersService.findOneInPublishedBook).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getRandomFlashcards', () => {
    it('should return random flashcards', async () => {
      const flashcards = [
        mockFlashcard,
        { ...mockFlashcard, id: 2 },
        { ...mockFlashcard, id: 3 },
        { ...mockFlashcard, id: 4 },
        { ...mockFlashcard, id: 5 },
      ];
      chaptersService.findOneInPublishedBook.mockResolvedValue({} as any);
      repository.find.mockResolvedValue(flashcards);

      const result = await service.getRandomFlashcards(1, 1, 3);

      expect(result).toHaveLength(3);
      expect(chaptersService.findOneInPublishedBook).toHaveBeenCalledWith(1, 1);
    });

    it('should return all flashcards if count exceeds available', async () => {
      const flashcards = [mockFlashcard, { ...mockFlashcard, id: 2 }];
      chaptersService.findOneInPublishedBook.mockResolvedValue({} as any);
      repository.find.mockResolvedValue(flashcards);

      const result = await service.getRandomFlashcards(1, 1, 10);

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a flashcard by id', async () => {
      repository.findOne.mockResolvedValue(mockFlashcard);

      const result = await service.findOne(1, 1, 1);

      expect(result).toEqual(mockFlashcard);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1, chapter_id: 1 },
      });
    });

    it('should throw NotFoundException when flashcard not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneInPublishedChapter', () => {
    it('should return a flashcard from a published chapter', async () => {
      chaptersService.findOneInPublishedBook.mockResolvedValue({} as any);
      repository.findOne.mockResolvedValue(mockFlashcard);

      const result = await service.findOneInPublishedChapter(1, 1, 1);

      expect(result).toEqual(mockFlashcard);
      expect(chaptersService.findOneInPublishedBook).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    const updateFlashcardDto: UpdateFlashcardDto = {
      question: 'Updated Question',
      answer: 'Updated Answer',
    };

    it('should update a flashcard successfully', async () => {
      const updatedFlashcard = { ...mockFlashcard, ...updateFlashcardDto };
      repository.findOne.mockResolvedValue(mockFlashcard);
      repository.save.mockResolvedValue(updatedFlashcard);

      const result = await service.update(1, 1, 1, updateFlashcardDto);

      expect(result).toEqual(updatedFlashcard);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate after update', async () => {
      repository.findOne.mockResolvedValue(mockFlashcard);
      repository.save.mockRejectedValue({ code: '23505' });

      await expect(service.update(1, 1, 1, updateFlashcardDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a flashcard successfully', async () => {
      repository.findOne.mockResolvedValue(mockFlashcard);
      repository.remove.mockResolvedValue(mockFlashcard);

      await service.delete(1, 1, 1);

      expect(repository.remove).toHaveBeenCalledWith(mockFlashcard);
    });
  });
});
