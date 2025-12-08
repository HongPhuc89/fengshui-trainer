import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizConfig } from './entities/quiz-config.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizConfigService } from './services/quiz-config.service';
import { QuestionBankService } from './services/question-bank.service';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { AdminQuizController } from './controllers/admin-quiz.controller';
import { AdminQuizConfigController } from './controllers/admin-quiz-config.controller';
import { UserQuizController } from './controllers/user-quiz.controller';

@Module({
    imports: [TypeOrmModule.forFeature([QuizConfig, Question, QuizAttempt])],
    providers: [QuizConfigService, QuestionBankService, QuizAttemptsService],
    controllers: [AdminQuizController, AdminQuizConfigController, UserQuizController],
    exports: [QuizConfigService, QuestionBankService, QuizAttemptsService],
})
export class QuizModule { }

