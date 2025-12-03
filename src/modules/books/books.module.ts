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
import { ChaptersController } from './chapters.controller';
import { AdminChaptersController } from './admin-chapters.controller';
import { BooksService } from './books.service';
import { ChaptersService } from './chapters.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter, BookChunk, UploadedFile]), UploadModule],
  controllers: [BooksController, AdminBooksController, ChaptersController, AdminChaptersController],
  providers: [BookProcessingService, BooksService, ChaptersService],
  exports: [BookProcessingService, BooksService, ChaptersService],
})
export class BooksModule {}
