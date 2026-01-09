import { Module } from '@nestjs/common';
import { CoreModule } from './modules/core/core.module';
import { TypeormModule } from './modules/typeorm/typeorm.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UserCredentialModule } from './modules/user-credential/user-credential.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { BooksModule } from './modules/books/books.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { MindMapModule } from './modules/mindmap/mindmap.module';
import { ExperienceModule } from './modules/experience/experience.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    CoreModule,
    TypeormModule,
    AuthModule,
    UsersModule,
    UserCredentialModule,
    UploadModule,
    BooksModule,
    QuizModule,
    MindMapModule,
    ExperienceModule,
    AdminModule,
    HealthModule,
    MediaModule,
  ],
})
export class AppModule {}
