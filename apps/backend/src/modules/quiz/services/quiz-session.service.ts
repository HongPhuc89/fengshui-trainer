import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession, QuizSessionStatus } from '../entities/quiz-session.entity';
import { QuizConfigService } from './quiz-config.service';
import { QuestionBankService } from './question-bank.service';

@Injectable()
export class QuizSessionService {
  constructor(
    @InjectRepository(QuizSession)
    private readonly sessionRepository: Repository<QuizSession>,
    private readonly configService: QuizConfigService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  async startQuiz(userId: number, chapterId: number): Promise<QuizSession> {
    // Get quiz config
    const config = await this.configService.findByChapterId(chapterId);
    if (!config) {
      throw new NotFoundException('Quiz config not found for this chapter');
    }

    // Get all active questions
    const allQuestions = await this.questionBankService.findActiveByChapter(chapterId);
    if (allQuestions.length === 0) {
      throw new BadRequestException('No questions available for this chapter');
    }

    // Calculate how many questions to select from each difficulty
    const questionsPerQuiz = config.questions_per_quiz;
    const easyCount = Math.round((questionsPerQuiz * config.easy_percentage) / 100);
    const mediumCount = Math.round((questionsPerQuiz * config.medium_percentage) / 100);
    const hardCount = questionsPerQuiz - easyCount - mediumCount;

    // Filter questions by difficulty
    const easyQuestions = allQuestions.filter((q) => q.difficulty === 'EASY');
    const mediumQuestions = allQuestions.filter((q) => q.difficulty === 'MEDIUM');
    const hardQuestions = allQuestions.filter((q) => q.difficulty === 'HARD');

    // Randomly select questions
    const selectedQuestions = [
      ...this.randomSelect(easyQuestions, easyCount),
      ...this.randomSelect(mediumQuestions, mediumCount),
      ...this.randomSelect(hardQuestions, hardCount),
    ];

    // Shuffle the selected questions
    this.shuffleArray(selectedQuestions);

    // Shuffle options for each question (except TRUE_FALSE)
    const questionsWithShuffledOptions = selectedQuestions.map((q) => {
      const question = { ...q };
      if (question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'MULTIPLE_ANSWER') {
        const options = { ...question.options };
        if (options.options && Array.isArray(options.options)) {
          options.options = [...options.options];
          this.shuffleArray(options.options);
        }
        question.options = options;
      }
      return question;
    });

    // Calculate total points
    const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

    // Create session
    const session = this.sessionRepository.create({
      user_id: userId,
      chapter_id: chapterId,
      questions: questionsWithShuffledOptions,
      answers: {},
      total_points: totalPoints,
      status: QuizSessionStatus.IN_PROGRESS,
      started_at: new Date(),
      time_limit_minutes: config.time_limit_minutes,
    });

    return this.sessionRepository.save(session);
  }

  async submitAnswer(sessionId: number, userId: number, questionId: number, answer: any): Promise<QuizSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Quiz session is not in progress');
    }

    // Update answers
    const answers = session.answers || {};
    answers[questionId] = answer;
    session.answers = answers;

    return this.sessionRepository.save(session);
  }

  async completeQuiz(sessionId: number, userId: number): Promise<QuizSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Quiz session is already completed');
    }

    // Calculate score
    let score = 0;
    const answers = session.answers || {};

    for (const question of session.questions) {
      const userAnswer = answers[question.id];
      if (!userAnswer) continue;

      const isCorrect = this.checkAnswer(question, userAnswer);
      if (isCorrect) {
        score += question.points;
      }
    }

    const percentage = (score / session.total_points) * 100;

    // Get quiz config to check passing score
    const config = await this.configService.findByChapterId(session.chapter_id);
    const passed = percentage >= config.passing_score_percentage;

    // Update session
    session.score = score;
    session.percentage = percentage;
    session.passed = passed;
    session.status = QuizSessionStatus.COMPLETED;
    session.completed_at = new Date();

    return this.sessionRepository.save(session);
  }

  async getSession(sessionId: number, userId: number): Promise<QuizSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    return session;
  }

  async getUserSessions(userId: number, chapterId?: number): Promise<QuizSession[]> {
    const where: any = { user_id: userId };
    if (chapterId) {
      where.chapter_id = chapterId;
    }

    return this.sessionRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  private checkAnswer(question: any, userAnswer: any): boolean {
    switch (question.question_type) {
      case 'TRUE_FALSE':
        return userAnswer === question.options.correct_answer;

      case 'MULTIPLE_CHOICE':
        return userAnswer === question.options.correct_answer;

      case 'MULTIPLE_ANSWER': {
        const correctAnswers = question.options.correct_answers || [];
        const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
        return (
          correctAnswers.length === userAnswers.length && correctAnswers.every((a: string) => userAnswers.includes(a))
        );
      }

      case 'MATCHING': {
        const correctPairs = question.options.pairs || [];
        const userPairs = userAnswer || {};
        return correctPairs.every((pair: any) => userPairs[pair.left] === pair.right);
      }

      case 'ORDERING': {
        const correctOrder = (question.options.items || []).map((item: any) => item.id);
        const userOrder = Array.isArray(userAnswer) ? userAnswer : [];
        return JSON.stringify(correctOrder) === JSON.stringify(userOrder);
      }

      default:
        return false;
    }
  }

  private randomSelect<T>(array: T[], count: number): T[] {
    const shuffled = [...array];
    this.shuffleArray(shuffled);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
