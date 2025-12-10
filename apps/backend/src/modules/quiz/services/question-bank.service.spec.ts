import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestionBankService } from './question-bank.service';
import { Question } from '../entities/question.entity';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import { QuestionType } from '../../../shares/enums/question-type.enum';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';

describe('QuestionBankService', () => {
  let service: QuestionBankService;
  let repository: jest.Mocked<Repository<Question>>;

  const mockQuestion: Question = {
    id: 1,
    chapter_id: 1,
    question_type: QuestionType.MULTIPLE_CHOICE,
    difficulty: DifficultyLevel.MEDIUM,
    question_text: 'What is 2+2?',
    options: {
      choices: [
        { id: 'a', text: '3', isCorrect: false },
        { id: 'b', text: '4', isCorrect: true },
        { id: 'c', text: '5', isCorrect: false },
      ],
    },
    points: 10,
    explanation: 'Basic arithmetic',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    chapter: null,
    attempts: [],
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        {
          provide: getRepositoryToken(Question),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuestionBankService>(QuestionBankService);
    repository = module.get(getRepositoryToken(Question));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createQuestionDto: CreateQuestionDto = {
      question_type: QuestionType.MULTIPLE_CHOICE,
      difficulty: DifficultyLevel.MEDIUM,
      question_text: 'What is 2+2?',
      options: {
        choices: [
          { id: 'a', text: '3', isCorrect: false },
          { id: 'b', text: '4', isCorrect: true },
          { id: 'c', text: '5', isCorrect: false },
        ],
      },
      points: 10,
      explanation: 'Basic arithmetic',
    };

    it('should create a question successfully', async () => {
      repository.create.mockReturnValue(mockQuestion as any);
      repository.save.mockResolvedValue(mockQuestion as any);

      const result = await service.create(1, createQuestionDto);

      expect(result).toEqual(mockQuestion);
      expect(repository.create).toHaveBeenCalledWith({
        chapter_id: 1,
        ...createQuestionDto,
      });
    });
  });

  describe('findAllByChapter', () => {
    it('should return all questions for a chapter', async () => {
      const questions = [mockQuestion];
      repository.find.mockResolvedValue(questions as any);

      const result = await service.findAllByChapter(1);

      expect(result).toEqual(questions);
      expect(repository.find).toHaveBeenCalledWith({
        where: { chapter_id: 1 },
        order: { difficulty: 'ASC', created_at: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('should return a question by id', async () => {
      repository.findOne.mockResolvedValue(mockQuestion as any);

      const result = await service.findById(1);

      expect(result).toEqual(mockQuestion);
    });

    it('should throw NotFoundException when question not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: Partial<CreateQuestionDto> = {
      question_text: 'Updated Question',
      points: 15,
    };

    it('should update a question successfully', async () => {
      const updatedQuestion = { ...mockQuestion, ...updateDto };
      repository.findOne.mockResolvedValue(mockQuestion as any);
      repository.save.mockResolvedValue(updatedQuestion as any);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(updatedQuestion);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a question successfully', async () => {
      repository.findOne.mockResolvedValue(mockQuestion as any);
      repository.remove.mockResolvedValue(mockQuestion as any);

      await service.delete(1);

      expect(repository.remove).toHaveBeenCalledWith(mockQuestion);
    });
  });

  describe('findActiveByChapter', () => {
    it('should return only active questions', async () => {
      const activeQuestions = [mockQuestion];
      repository.find.mockResolvedValue(activeQuestions as any);

      const result = await service.findActiveByChapter(1);

      expect(result).toEqual(activeQuestions);
      expect(repository.find).toHaveBeenCalledWith({
        where: { chapter_id: 1, is_active: true },
      });
    });
  });

  describe('exportToCSV', () => {
    it('should export questions to CSV format', async () => {
      repository.find.mockResolvedValue([mockQuestion] as any);

      const result = await service.exportToCSV(1);

      expect(result).toContain('question_type,difficulty,question_text,points,options,explanation');
      expect(result).toContain('What is 2+2?');
      expect(result).toContain('10');
    });

    it('should handle questions without explanation', async () => {
      const questionWithoutExplanation = { ...mockQuestion, explanation: null };
      repository.find.mockResolvedValue([questionWithoutExplanation] as any);

      const result = await service.exportToCSV(1);

      expect(result).toBeDefined();
    });
  });

  describe('importFromCSV', () => {
    const validCSV = `question_type,difficulty,question_text,points,options,explanation
multiple_choice,medium,"What is 2+2?",10,"{""choices"":[{""id"":""a"",""text"":""4"",""isCorrect"":true}]}","Basic math"`;

    it('should import questions from CSV successfully', async () => {
      repository.create.mockReturnValue(mockQuestion as any);
      repository.save.mockResolvedValue(mockQuestion as any);

      const result = await service.importFromCSV(1, validCSV);

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty CSV', async () => {
      const result = await service.importFromCSV(1, '');

      expect(result.success).toBe(0);
      expect(result.errors).toContain('CSV file is empty or invalid');
    });

    it('should handle CSV with insufficient columns', async () => {
      const invalidCSV = `question_type,difficulty,question_text,points,options,explanation
multiple_choice,medium`;

      const result = await service.importFromCSV(1, invalidCSV);

      expect(result.success).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid points value', async () => {
      const invalidCSV = `question_type,difficulty,question_text,points,options,explanation
multiple_choice,medium,"Question",invalid_points,"{}",""`;

      const result = await service.importFromCSV(1, invalidCSV);

      expect(result.success).toBe(0);
      expect(result.errors.some((e) => e.includes('Invalid points value'))).toBe(true);
    });

    it('should handle invalid JSON in options', async () => {
      const invalidCSV = `question_type,difficulty,question_text,points,options,explanation
multiple_choice,medium,"Question",10,"invalid_json",""`;

      const result = await service.importFromCSV(1, invalidCSV);

      expect(result.success).toBe(0);
      expect(result.errors.some((e) => e.includes('Invalid JSON in options'))).toBe(true);
    });

    it('should handle mixed valid and invalid rows', async () => {
      const mixedCSV = `question_type,difficulty,question_text,points,options,explanation
multiple_choice,medium,"Valid Question",10,"{""choices"":[]}","Explanation"
multiple_choice,medium,"Invalid",invalid_points,"{}",""`;

      repository.create.mockReturnValue(mockQuestion as any);
      repository.save.mockResolvedValue(mockQuestion as any);

      const result = await service.importFromCSV(1, mixedCSV);

      expect(result.success).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const line = 'value1,value2,value3';
      const result = service['parseCSVLine'](line);

      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should parse CSV line with quoted values', () => {
      const line = '"value1","value2","value3"';
      const result = service['parseCSVLine'](line);

      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle escaped quotes', () => {
      const line = '"value with ""quotes""","normal value"';
      const result = service['parseCSVLine'](line);

      expect(result).toEqual(['value with "quotes"', 'normal value']);
    });

    it('should handle commas inside quotes', () => {
      const line = '"value, with, commas","normal"';
      const result = service['parseCSVLine'](line);

      expect(result).toEqual(['value, with, commas', 'normal']);
    });
  });
});
