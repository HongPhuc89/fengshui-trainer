import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizChapterConfig } from './entities/quiz-chapter-config.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizConfigService } from './services/quiz-config.service';
import { QuestionBankService } from './services/question-bank.service';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { AdminQuizController } from './controllers/admin-quiz.controller';
import { UserQuizController } from './controllers/user-quiz.controller';

@Module({
    imports: [TypeOrmModule.forFeature([QuizChapterConfig, Question, QuizAttempt])],
    providers: [QuizConfigService, QuestionBankService, QuizAttemptsService],
    controllers: [AdminQuizController, UserQuizController],
    exports: [QuizConfigService, QuestionBankService, QuizAttemptsService],
})
export class QuizModule { }
