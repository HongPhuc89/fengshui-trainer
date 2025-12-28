import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Question } from '../entities/question.entity';
import { QuizConfigService } from './quiz-config.service';
import { QuestionBankService } from './question-bank.service';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';
import { QuestionType } from '../../../shares/enums/question-type.enum';
import { UserExperienceService } from '../../experience/services/user-experience.service';
import { ExperienceSourceType } from '../../../shares/enums/experience-source-type.enum';
import { Chapter } from '../../books/entities/chapter.entity';

@Injectable()
export class QuizAttemptsService {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    private readonly configService: QuizConfigService,
    private readonly questionBankService: QuestionBankService,
    private readonly userExperienceService: UserExperienceService,
  ) {}

  async startQuiz(userId: number, chapterId: number): Promise<any> {
    // Get quiz config
    const config = await this.configService.getOrCreateDefault(chapterId);
    if (!config.is_active) {
      throw new BadRequestException('Quiz is not active');
    }

    // Get all active questions for chapter
    const allQuestions = await this.questionBankService.findActiveByChapter(chapterId);

    if (allQuestions.length === 0) {
      throw new BadRequestException('No questions available for this quiz');
    }

    // Select random questions based on config
    const selectedQuestions = this.selectRandomQuestions(
      allQuestions,
      config.questions_per_quiz,
      config.easy_percentage,
      config.medium_percentage,
      config.hard_percentage,
      config.shuffle_questions,
    );
    const questionIds = selectedQuestions.map((q) => q.id);
    const maxScore = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

    // Create attempt
    const attempt = this.attemptRepository.create({
      chapter_id: chapterId,
      user_id: userId,
      selected_questions: questionIds,
      max_score: maxScore,
      started_at: new Date(),
    });

    await this.attemptRepository.save(attempt);

    // Return quiz data (without correct answers)
    return {
      attempt_id: attempt.id,
      quiz_config: {
        title: config.title,
        description: config.description,
        time_limit_minutes: config.time_limit_minutes,
        questions_count: selectedQuestions.length,
        passing_score_percentage: config.passing_score_percentage,
        shuffle_options: config.shuffle_options,
        show_results_immediately: config.show_results_immediately,
      },
      questions: selectedQuestions.map((q) => this.sanitizeQuestion(q)),
      started_at: attempt.started_at,
    };
  }

  async submitQuiz(userId: number, attemptId: number, answers: any): Promise<any> {
    // Get attempt
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, user_id: userId },
      relations: ['chapter'],
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.completed_at) {
      throw new BadRequestException('Quiz already submitted');
    }

    // Get questions
    const questions = await this.questionBankService.findActiveByChapter(attempt.chapter_id);
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Grade answers
    const results = [];
    let totalScore = 0;

    for (const questionId of attempt.selected_questions) {
      const question = questionMap.get(questionId);
      if (!question) continue;

      const userAnswer = answers[questionId];
      const { isCorrect, pointsEarned } = this.gradeAnswer(question, userAnswer);

      totalScore += pointsEarned;

      results.push({
        question_id: questionId,
        question_text: question.question_text,
        user_answer: userAnswer,
        correct_answer: this.extractCorrectAnswer(question),
        is_correct: isCorrect,
        points_earned: pointsEarned,
        explanation: question.explanation,
      });
    }

    // Calculate percentage and pass status
    const percentage = (totalScore / attempt.max_score) * 100;
    const config = await this.configService.getOrCreateDefault(attempt.chapter_id);
    const passed = percentage >= config.passing_score_percentage;

    // Update attempt
    attempt.answers = answers;
    attempt.score = totalScore;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.completed_at = new Date();

    await this.attemptRepository.save(attempt);

    // Award XP with first-time pass bonus logic
    const xpInfo = await this.awardQuizXP(userId, attempt.chapter_id, percentage, passed, attemptId);

    return {
      score: totalScore,
      max_score: attempt.max_score,
      percentage: percentage.toFixed(2),
      passed,
      results,
      experience: xpInfo,
    };
  }

  async getUserAttempts(userId: number, chapterId: number): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: { user_id: userId, chapter_id: chapterId },
      order: { created_at: 'DESC' },
    });
  }

  async getAttemptById(userId: number, attemptId: number): Promise<any> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, user_id: userId },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }

  // Private helper methods
  private selectRandomQuestions(
    questions: Question[],
    count: number,
    easyPercentage: number,
    mediumPercentage: number,
    hardPercentage: number,
    shuffle: boolean = true,
  ): Question[] {
    // Weighted random selection by difficulty based on config
    const easy = questions.filter((q) => q.difficulty === DifficultyLevel.EASY);
    const medium = questions.filter((q) => q.difficulty === DifficultyLevel.MEDIUM);
    const hard = questions.filter((q) => q.difficulty === DifficultyLevel.HARD);

    const targetEasy = Math.floor((count * easyPercentage) / 100);
    const targetMedium = Math.floor((count * mediumPercentage) / 100);
    const targetHard = count - targetEasy - targetMedium;

    const selected: Question[] = [];

    // Select from each difficulty level
    selected.push(...this.randomSelect(easy, Math.min(targetEasy, easy.length)));
    selected.push(...this.randomSelect(medium, Math.min(targetMedium, medium.length)));
    selected.push(...this.randomSelect(hard, Math.min(targetHard, hard.length)));

    // Backfill if needed
    const remaining = count - selected.length;
    if (remaining > 0) {
      const unselected = questions.filter((q) => !selected.includes(q));
      selected.push(...this.randomSelect(unselected, Math.min(remaining, unselected.length)));
    }

    // Shuffle final selection if configured
    return shuffle ? this.shuffle(selected) : selected;
  }

  private randomSelect<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle([...array]);
    return shuffled.slice(0, count);
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private sanitizeQuestion(question: Question): any {
    const { options, ...rest } = question;

    // Remove correct answers from options
    const sanitizedOptions = { ...options };

    switch (question.question_type) {
      case QuestionType.TRUE_FALSE:
        delete sanitizedOptions.correct_answer;
        break;
      case QuestionType.MULTIPLE_CHOICE:
        delete sanitizedOptions.correct_answer;
        break;
      case QuestionType.MULTIPLE_ANSWER:
        delete sanitizedOptions.correct_answers;
        break;
      case QuestionType.MATCHING:
        // Shuffle right side for matching
        if (sanitizedOptions.pairs) {
          const rights = sanitizedOptions.pairs.map((p: any) => p.right);
          const shuffled = this.shuffle(rights);
          sanitizedOptions.pairs = sanitizedOptions.pairs.map((p: any, i: number) => ({
            ...p,
            right: shuffled[i],
          }));
        }
        break;
      case QuestionType.ORDERING:
        // Shuffle items for ordering
        if (sanitizedOptions.items) {
          sanitizedOptions.items = this.shuffle(
            sanitizedOptions.items.map((item: any) => {
              const { correct_order, ...rest } = item;
              return rest;
            }),
          );
        }
        break;
    }

    return {
      ...rest,
      options: sanitizedOptions,
      explanation: undefined, // Don't show explanation until after submission
    };
  }

  private extractCorrectAnswer(question: Question): any {
    const { options } = question;

    switch (question.question_type) {
      case QuestionType.TRUE_FALSE:
        return options.correct_answer;
      case QuestionType.MULTIPLE_CHOICE:
        return options.correct_answer;
      case QuestionType.MULTIPLE_ANSWER:
        return options.correct_answers;
      case QuestionType.MATCHING:
        return options.pairs;
      case QuestionType.ORDERING:
        return options.items.sort((a: any, b: any) => a.correct_order - b.correct_order);
      default:
        return null;
    }
  }

  private gradeAnswer(question: Question, userAnswer: any): { isCorrect: boolean; pointsEarned: number } {
    const { options, points } = question;

    switch (question.question_type) {
      case QuestionType.TRUE_FALSE:
        return {
          isCorrect: userAnswer === options.correct_answer,
          pointsEarned: userAnswer === options.correct_answer ? points : 0,
        };

      case QuestionType.MULTIPLE_CHOICE:
        return {
          isCorrect: userAnswer === options.correct_answer,
          pointsEarned: userAnswer === options.correct_answer ? points : 0,
        };

      case QuestionType.MULTIPLE_ANSWER: {
        const correctAnswers = new Set(options.correct_answers);
        const userAnswers = new Set(userAnswer || []);
        const isCorrect =
          correctAnswers.size === userAnswers.size && [...correctAnswers].every((a) => userAnswers.has(a));

        return {
          isCorrect,
          pointsEarned: isCorrect ? points : 0,
        };
      }

      case QuestionType.MATCHING: {
        const correctPairs = options.pairs;
        let correctCount = 0;

        for (const pair of correctPairs) {
          if (userAnswer && userAnswer[pair.id] === pair.right) {
            correctCount++;
          }
        }

        const percentage = correctPairs.length > 0 ? correctCount / correctPairs.length : 0;
        return {
          isCorrect: percentage === 1,
          pointsEarned: Math.round(points * percentage),
        };
      }

      case QuestionType.ORDERING: {
        const correctOrder = options.items.sort((a: any, b: any) => a.correct_order - b.correct_order);
        let correctCount = 0;

        for (let i = 0; i < correctOrder.length; i++) {
          if (userAnswer && userAnswer[i] === correctOrder[i].id) {
            correctCount++;
          }
        }

        const percentage = correctOrder.length > 0 ? correctCount / correctOrder.length : 0;
        return {
          isCorrect: percentage === 1,
          pointsEarned: Math.round(points * percentage),
        };
      }

      default:
        return { isCorrect: false, pointsEarned: 0 };
    }
  }

  /**
   * Award XP for quiz completion with first-time pass bonus
   */
  private async awardQuizXP(
    userId: number,
    chapterId: number,
    percentage: number,
    passed: boolean,
    attemptId: number,
  ): Promise<any> {
    // Get chapter to retrieve point value
    const chapter = await this.chapterRepository.findOne({
      where: { id: chapterId },
    });

    if (!chapter) {
      return null;
    }

    const chapterPoint = chapter.points || 50; // Default 50 if not set
    const perfectBonus = Math.floor(chapterPoint * 0.5); // 50% of chapter point
    const config = await this.configService.getOrCreateDefault(chapterId);
    const passingScore = config.passing_score_percentage;

    // Check if this is the first time user passes this chapter's quiz
    const isFirstTimePass = await this.checkFirstTimePass(userId, chapterId);

    let xpEarned = 0;
    let levelUp = false;
    let previousLevel: any;
    let currentLevel: any;

    if (isFirstTimePass && passed) {
      // First time pass: Award full chapter point
      xpEarned = chapterPoint;

      const result = await this.userExperienceService.awardXP(
        userId,
        ExperienceSourceType.QUIZ_ATTEMPT,
        xpEarned,
        attemptId,
        `First time passing chapter quiz (${percentage.toFixed(1)}%)`,
      );

      levelUp = result.levelUp;
      previousLevel = result.previousLevel;
      currentLevel = result.newLevel;

      // Bonus for perfect score on first attempt
      if (percentage === 100) {
        const bonusResult = await this.userExperienceService.awardXP(
          userId,
          ExperienceSourceType.QUIZ_PERFECT,
          perfectBonus,
          attemptId,
          'Perfect score on first attempt',
        );

        xpEarned += perfectBonus;

        // Check if bonus caused level up
        if (bonusResult.levelUp) {
          levelUp = true;
          previousLevel = bonusResult.previousLevel;
          currentLevel = bonusResult.newLevel;
        }
      }
    } else {
      // Subsequent attempts: Award XP based on score percentage
      xpEarned = Math.floor(chapterPoint * (percentage / 100));

      const result = await this.userExperienceService.awardXP(
        userId,
        ExperienceSourceType.QUIZ_ATTEMPT,
        xpEarned,
        attemptId,
        `Completed quiz with ${percentage.toFixed(1)}% score`,
      );

      levelUp = result.levelUp;
      previousLevel = result.previousLevel;
      currentLevel = result.newLevel;

      // Bonus for perfect score
      if (percentage === 100) {
        const bonusResult = await this.userExperienceService.awardXP(
          userId,
          ExperienceSourceType.QUIZ_PERFECT,
          perfectBonus,
          attemptId,
          'Perfect score bonus',
        );

        xpEarned += perfectBonus;

        // Check if bonus caused level up
        if (bonusResult.levelUp) {
          levelUp = true;
          previousLevel = bonusResult.previousLevel;
          currentLevel = bonusResult.newLevel;
        }
      }
    }

    // Get updated user XP summary
    const xpSummary = await this.userExperienceService.getUserXPSummary(userId);

    return {
      xp_earned: xpEarned,
      is_first_time_pass: isFirstTimePass && passed,
      chapter_point: chapterPoint,
      level_up: levelUp,
      previous_level: previousLevel,
      current_level: currentLevel || xpSummary.current_level,
      total_xp: xpSummary.total_xp,
      next_level: xpSummary.next_level,
    };
  }

  /**
   * Check if this is the first time user passes this chapter's quiz
   */
  private async checkFirstTimePass(userId: number, chapterId: number): Promise<boolean> {
    const previousPassedAttempt = await this.attemptRepository.findOne({
      where: {
        user_id: userId,
        chapter_id: chapterId,
        passed: true,
      },
      order: {
        completed_at: 'ASC',
      },
    });

    return !previousPassedAttempt;
  }
}
