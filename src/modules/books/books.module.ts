import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Chapter } from './entities/chapter.entity';
import { BookChunk } from './entities/book-chunk.entity';
import { BookProcessingService } from './book-processing.service';
import { UploadModule } from '../upload/upload.module';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { BooksController } from './books.controller';
import { AdminBooksController } from './admin-books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter, BookChunk, UploadedFile]), UploadModule],
  controllers: [BooksController, AdminBooksController],
  providers: [BookProcessingService, BooksService],
  exports: [BookProcessingService, BooksService],
})
export class BooksModule {}
