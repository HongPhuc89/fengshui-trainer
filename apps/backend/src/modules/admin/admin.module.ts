import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { UploadModule } from '../upload/upload.module';
import { BooksModule } from '../books/books.module';

@Module({
  imports: [UsersModule, UploadModule, BooksModule],
})
export class AdminModule {}
