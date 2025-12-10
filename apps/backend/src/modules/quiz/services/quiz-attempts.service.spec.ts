import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttemptsService } from './quiz-attempts.service';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { QuizConfigService } from './quiz-config.service';
import { QuestionBankService } from './question-bank.service';
import { Question } from '../entities/question.entity';
import { QuestionType } from '../../../shares/enums/question-type.enum';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';

describe('QuizAttemptsService', () => {
  let service: QuizAttemptsService;
  let repository: jest.Mocked<Repository<QuizAttempt>>;
  let configService: jest.Mocked<QuizConfigService>;
  let questionBankService: jest.Mocked<QuestionBankService>;

  const mockQuestion: Question = {
    id: 1,
    chapter_id: 1,
    question_type: QuestionType.MULTIPLE_CHOICE,
    difficulty: DifficultyLevel.MEDIUM,
    question_text: 'What is 2+2?',
    options: {
      correct_answer: 'b',
    },
    points: 10,
    explanation: 'Basic arithmetic',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    chapter: null,
    attempts: [],
  } as Question;

  const mockAttempt: QuizAttempt = {
    id: 1,
    user_id: 1,
    chapter_id: 1,
    selected_questions: [1],
    answers: {},
    score: 0,
    max_score: 10,
    percentage: 0,
    passed: false,
    started_at: new Date(),
    completed_at: null,
    created_at: new Date(),
    user: null,
    chapter: null,
  } as any;

  const mockConfig = {
    id: 1,
    chapter_id: 1,
    title: 'Test Quiz',
    description: 'Test Description',
    questions_per_quiz: 10,
    time_limit_minutes: 30,
    passing_score_percentage: 70,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizAttemptsService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: QuizConfigService,
          useValue: {
            findByChapterId: jest.fn(),
          },
        },
        {
          provide: QuestionBankService,
          useValue: {
            findActiveByChapter: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuizAttemptsService>(QuizAttemptsService);
    repository = module.get(getRepositoryToken(QuizAttempt));
    configService = module.get(QuizConfigService);
    questionBankService = module.get(QuestionBankService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startQuiz', () => {
    it('should start a quiz successfully', async () => {
      const questions = Array(15)
        .fill(mockQuestion)
        .map((q, i) => ({ ...q, id: i + 1 }));
      questionBankService.findActiveByChapter.mockResolvedValue(questions);
      configService.findByChapterId.mockResolvedValue(mockConfig);
      repository.create.mockReturnValue(mockAttempt as any);
      repository.save.mockResolvedValue(mockAttempt);

      const result = await service.startQuiz(1, 1);

      expect(result).toBeDefined();
      expect(result.attempt_id).toBe(mockAttempt.id);
      expect(result.questions).toBeDefined();
      expect(questionBankService.findActiveByChapter).toHaveBeenCalledWith(1);
    });

    it('should throw error when quiz is not active', async () => {
      configService.findByChapterId.mockResolvedValue({ ...mockConfig, is_active: false });

      await expect(service.startQuiz(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when no active questions available', async () => {
      questionBankService.findActiveByChapter.mockResolvedValue([]);
      configService.findByChapterId.mockResolvedValue(mockConfig);

      await expect(service.startQuiz(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should adjust question count if not enough questions available', async () => {
      const questions = [mockQuestion, { ...mockQuestion, id: 2 }];
      questionBankService.findActiveByChapter.mockResolvedValue(questions);
      configService.findByChapterId.mockResolvedValue(mockConfig);
      repository.create.mockReturnValue(mockAttempt as any);
      repository.save.mockResolvedValue(mockAttempt);

      const result = await service.startQuiz(1, 1);

      expect(result.questions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('submitQuiz', () => {
    const answers = {
      1: 'b',
    };

    it('should submit quiz successfully', async () => {
      const completedAttempt = { ...mockAttempt, completed_at: new Date(), score: 10 };
      repository.findOne.mockResolvedValue(mockAttempt);
      questionBankService.findActiveByChapter.mockResolvedValue([mockQuestion]);
      configService.findByChapterId.mockResolvedValue(mockConfig);
      repository.save.mockResolvedValue(completedAttempt);

      const result = await service.submitQuiz(1, 1, answers);

      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
      expect(result.max_score).toBeDefined();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw error when attempt not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.submitQuiz(1, 1, answers)).rejects.toThrow(NotFoundException);
    });

    it('should throw error when quiz already completed', async () => {
      const completedAttempt = { ...mockAttempt, completed_at: new Date() };
      repository.findOne.mockResolvedValue(completedAttempt);

      await expect(service.submitQuiz(1, 1, answers)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserAttempts', () => {
    it('should return user attempts for a chapter', async () => {
      const attempts = [mockAttempt];
      repository.find.mockResolvedValue(attempts);

      const result = await service.getUserAttempts(1, 1);

      expect(result).toEqual(attempts);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 1, chapter_id: 1 },
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('getAttemptById', () => {
    it('should return attempt details', async () => {
      repository.findOne.mockResolvedValue(mockAttempt);

      const result = await service.getAttemptById(1, 1);

      expect(result).toBeDefined();
    });

    it('should throw error when attempt not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getAttemptById(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sanitizeQuestion', () => {
    it('should remove correct answer from multiple choice question', () => {
      const result = service['sanitizeQuestion'](mockQuestion);

      expect(result.options.correct_answer).toBeUndefined();
    });

    it('should handle true/false questions', () => {
      const tfQuestion = {
        ...mockQuestion,
        question_type: QuestionType.TRUE_FALSE,
        options: { correct_answer: true },
      } as Question;

      const result = service['sanitizeQuestion'](tfQuestion);

      expect(result.options.correct_answer).toBeUndefined();
    });

    it('should handle multiple answer questions', () => {
      const maQuestion = {
        ...mockQuestion,
        question_type: QuestionType.MULTIPLE_ANSWER,
        options: {
          correct_answers: ['a', 'b'],
        },
      } as Question;

      const result = service['sanitizeQuestion'](maQuestion);

      expect(result.options.correct_answers).toBeUndefined();
    });
  });

  describe('extractCorrectAnswer', () => {
    it('should extract correct answer from multiple choice', () => {
      const result = service['extractCorrectAnswer'](mockQuestion);

      expect(result).toBe('b');
    });

    it('should extract correct answer from true/false', () => {
      const tfQuestion = {
        ...mockQuestion,
        question_type: QuestionType.TRUE_FALSE,
        options: { correct_answer: true },
      } as Question;

      const result = service['extractCorrectAnswer'](tfQuestion);

      expect(result).toBe(true);
    });

    it('should extract correct answers from multiple answer', () => {
      const maQuestion = {
        ...mockQuestion,
        question_type: QuestionType.MULTIPLE_ANSWER,
        options: {
          correct_answers: ['a', 'b'],
        },
      } as Question;

      const result = service['extractCorrectAnswer'](maQuestion);

      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('gradeAnswer', () => {
    it('should grade correct multiple choice answer', () => {
      const result = service['gradeAnswer'](mockQuestion, 'b');

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(mockQuestion.points);
    });

    it('should grade incorrect multiple choice answer', () => {
      const result = service['gradeAnswer'](mockQuestion, 'a');

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should grade true/false question', () => {
      const tfQuestion = {
        ...mockQuestion,
        question_type: QuestionType.TRUE_FALSE,
        options: { correct_answer: true },
      } as Question;

      const correctResult = service['gradeAnswer'](tfQuestion, true);
      expect(correctResult.isCorrect).toBe(true);

      const incorrectResult = service['gradeAnswer'](tfQuestion, false);
      expect(incorrectResult.isCorrect).toBe(false);
    });

    it('should grade multiple answer question with all correct', () => {
      const maQuestion = {
        ...mockQuestion,
        question_type: QuestionType.MULTIPLE_ANSWER,
        options: {
          correct_answers: ['a', 'b'],
        },
      } as Question;

      const result = service['gradeAnswer'](maQuestion, ['a', 'b']);

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBe(maQuestion.points);
    });

    it('should grade multiple answer question with partial correct', () => {
      const maQuestion = {
        ...mockQuestion,
        question_type: QuestionType.MULTIPLE_ANSWER,
        options: {
          correct_answers: ['a', 'b'],
        },
      } as Question;

      const result = service['gradeAnswer'](maQuestion, ['a']);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });

    it('should handle missing answer', () => {
      const result = service['gradeAnswer'](mockQuestion, null);

      expect(result.isCorrect).toBe(false);
      expect(result.pointsEarned).toBe(0);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array', () => {
      const array = [1, 2, 3, 4, 5];
      const shuffled = service['shuffle']([...array]);

      expect(shuffled).toHaveLength(array.length);
      expect(shuffled.sort()).toEqual(array.sort());
    });

    it('should not modify original array', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      service['shuffle'](copy);

      // Original should not be modified (we passed a copy)
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
