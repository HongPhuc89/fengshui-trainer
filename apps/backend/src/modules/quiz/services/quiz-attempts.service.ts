import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttempt } from '../entities/quiz-attempt.entity';
import { Question } from '../entities/question.entity';
import { QuizConfigService } from './quiz-config.service';
import { QuestionBankService } from './question-bank.service';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';
import { QuestionType } from '../../../shares/enums/question-type.enum';

@Injectable()
export class QuizAttemptsService {
    constructor(
        @InjectRepository(QuizAttempt)
        private readonly attemptRepository: Repository<QuizAttempt>,
        private readonly configService: QuizConfigService,
        private readonly questionBankService: QuestionBankService,
    ) { }

    async startQuiz(userId: number, chapterId: number): Promise<any> {
        // Get quiz config
        const config = await this.configService.findByChapterId(chapterId);
        if (!config.is_active) {
            throw new BadRequestException('Quiz is not active');
        }

        // Get all active questions for chapter
        const allQuestions = await this.questionBankService.findActiveByChapter(chapterId);

        if (allQuestions.length === 0) {
            throw new BadRequestException('No questions available for this quiz');
        }

        // Select random questions
        const selectedQuestions = this.selectRandomQuestions(allQuestions, config.questions_per_quiz);
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
            },
            questions: selectedQuestions.map((q) => this.sanitizeQuestion(q)),
            started_at: attempt.started_at,
        };
    }

    async submitQuiz(userId: number, attemptId: number, answers: any): Promise<any> {
        // Get attempt
        const attempt = await this.attemptRepository.findOne({
            where: { id: attemptId, user_id: userId },
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
        const config = await this.configService.findByChapterId(attempt.chapter_id);
        const passed = percentage >= config.passing_score_percentage;

        // Update attempt
        attempt.answers = answers;
        attempt.score = totalScore;
        attempt.percentage = percentage;
        attempt.passed = passed;
        attempt.completed_at = new Date();

        await this.attemptRepository.save(attempt);

        return {
            score: totalScore,
            max_score: attempt.max_score,
            percentage: percentage.toFixed(2),
            passed,
            results,
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
    private selectRandomQuestions(questions: Question[], count: number): Question[] {
        // Weighted random selection by difficulty (40% EASY, 40% MEDIUM, 20% HARD)
        const easy = questions.filter((q) => q.difficulty === DifficultyLevel.EASY);
        const medium = questions.filter((q) => q.difficulty === DifficultyLevel.MEDIUM);
        const hard = questions.filter((q) => q.difficulty === DifficultyLevel.HARD);

        const targetEasy = Math.floor(count * 0.4);
        const targetMedium = Math.floor(count * 0.4);
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

        // Shuffle final selection
        return this.shuffle(selected);
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
        let sanitizedOptions = { ...options };

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
                    sanitizedOptions.items = this.shuffle(sanitizedOptions.items.map((item: any) => {
                        const { correct_order, ...rest } = item;
                        return rest;
                    }));
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
                    correctAnswers.size === userAnswers.size &&
                    [...correctAnswers].every((a) => userAnswers.has(a));

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
}
