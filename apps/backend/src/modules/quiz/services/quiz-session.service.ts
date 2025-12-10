import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizSession, QuizSessionStatus } from '../entities/quiz-session.entity';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { QuizConfigService } from './quiz-config.service';
import { QuestionBankService } from './question-bank.service';

@Injectable()
export class QuizSessionService {
  constructor(
    @InjectRepository(QuizSession)
    private readonly sessionRepository: Repository<QuizSession>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
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

    // Log question types available
    const questionTypes = allQuestions.reduce(
      (acc, q) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log('📊 Available question types:', questionTypes);

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

    // Log selected question types
    const selectedTypes = selectedQuestions.reduce(
      (acc, q) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    console.log('✅ Selected question types:', selectedTypes);

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

    // Calculate total points - ensure each question has at least 1 point
    const totalPoints = selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0);

    console.log('💯 Total points for quiz:', totalPoints);
    console.log(
      '📝 Questions breakdown:',
      selectedQuestions.map((q) => ({
        id: q.id,
        points: q.points || 1,
        difficulty: q.difficulty,
      })),
    );

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

  async completeQuiz(sessionId: number, userId: number): Promise<any> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    if (session.status !== QuizSessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Quiz session is already completed');
    }

    // Calculate score and recalculate total points from actual questions
    let score = 0;
    let totalPoints = 0;
    const answers = session.answers || {};
    const results = [];

    console.log('🎯 Calculating quiz score...');
    console.log('📊 Total questions:', session.questions.length);
    console.log('📝 Answers submitted:', Object.keys(answers).length);

    for (const question of session.questions) {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer ? this.checkAnswer(question, userAnswer) : false;

      // Ensure points has a value (default to 1 if missing)
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;

      console.log(`Question ${question.id}:`, {
        points: questionPoints,
        isCorrect,
        userAnswer,
      });

      if (isCorrect) {
        score += questionPoints;
      }

      results.push({
        question_id: question.id,
        question_text: question.question_text,
        is_correct: isCorrect,
        points: questionPoints,
        user_answer: userAnswer,
      });
    }

    console.log('✅ Final score:', score, '/', totalPoints);

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    // Get quiz config to check passing score
    const config = await this.configService.findByChapterId(session.chapter_id);
    const passed = percentage >= config.passing_score_percentage;

    // Update session with recalculated total_points
    session.score = score;
    session.total_points = totalPoints;
    session.percentage = percentage;
    session.passed = passed;
    session.status = QuizSessionStatus.COMPLETED;
    session.completed_at = new Date();

    const savedSession = await this.sessionRepository.save(session);

    // Create quiz attempt record
    const questionIds = session.questions.map((q) => q.id);
    const attempt = this.attemptRepository.create({
      chapter_id: session.chapter_id,
      user_id: userId,
      selected_questions: questionIds,
      score: score,
      max_score: totalPoints,
      percentage: percentage,
      passed: passed,
      answers: session.answers,
      started_at: session.started_at,
      completed_at: session.completed_at,
    });

    await this.attemptRepository.save(attempt);
    console.log('✅ Quiz attempt saved:', attempt.id);

    // Return detailed results
    const correctCount = results.filter((r) => r.is_correct).length;

    return {
      ...savedSession,
      passing_score_percentage: config.passing_score_percentage,
      correct_count: correctCount,
      incorrect_count: session.questions.length - correctCount,
      total_questions: session.questions.length,
      results,
    };
  }

  async getSession(sessionId: number, userId: number): Promise<any> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('Quiz session not found');
    }

    // If quiz is completed, calculate correct/incorrect counts
    if (session.status === QuizSessionStatus.COMPLETED) {
      const answers = session.answers || {};
      let correctCount = 0;

      for (const question of session.questions) {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer ? this.checkAnswer(question, userAnswer) : false;
        if (isCorrect) {
          correctCount++;
        }
      }

      const config = await this.configService.findByChapterId(session.chapter_id);

      return {
        ...session,
        correct_count: correctCount,
        incorrect_count: session.questions.length - correctCount,
        total_questions: session.questions.length,
        passing_score_percentage: config.passing_score_percentage,
      };
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
