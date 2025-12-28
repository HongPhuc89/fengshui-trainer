import { Module } from '@nestjs/common';
import { CoreModule } from './modules/core/core.module';
import { TypeormModule } from './modules/typeorm/typeorm.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UserCredentialModule } from './modules/user-credential/user-credential.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { BooksModule } from './modules/books/books.module';

@Module({
  imports: [
    CoreModule,
    TypeormModule,
    AuthModule,
    UsersModule,
    UserCredentialModule,
    UploadModule,
    BooksModule,
    AdminModule,
  ],
})
export class AppModule {}
