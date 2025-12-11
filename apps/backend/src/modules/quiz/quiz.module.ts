import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizConfig } from './entities/quiz-config.entity';
import { Question } from './entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizSession } from './entities/quiz-session.entity';
import { Chapter } from '../books/entities/chapter.entity';
import { QuizConfigService } from './services/quiz-config.service';
import { QuestionBankService } from './services/question-bank.service';
import { QuizAttemptsService } from './services/quiz-attempts.service';
import { QuizSessionService } from './services/quiz-session.service';
import { AdminQuizController } from './controllers/admin-quiz.controller';
import { AdminQuizConfigController } from './controllers/admin-quiz-config.controller';
import { UserQuizController } from './controllers/user-quiz.controller';
import { QuizSessionController } from './controllers/quiz-session.controller';
import { ExperienceModule } from '../experience/experience.module';

@Module({
  imports: [TypeOrmModule.forFeature([QuizConfig, Question, QuizAttempt, QuizSession, Chapter]), ExperienceModule],
  providers: [QuizConfigService, QuestionBankService, QuizAttemptsService, QuizSessionService],
  controllers: [AdminQuizController, AdminQuizConfigController, UserQuizController, QuizSessionController],
  exports: [QuizConfigService, QuestionBankService, QuizAttemptsService, QuizSessionService],
})
export class QuizModule {}
