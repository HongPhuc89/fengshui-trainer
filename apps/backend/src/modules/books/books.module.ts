import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Chapter } from './entities/chapter.entity';
import { BookChunk } from './entities/book-chunk.entity';
import { BookProcessingService } from './book-processing.service';
import { UploadModule } from '../upload/upload.module';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { Flashcard } from './entities/flashcard.entity';
import { BooksController } from './books.controller';
import { AdminBooksController } from './admin-books.controller';
import { ChaptersController } from './chapters.controller';
import { AdminChaptersController } from './admin-chapters.controller';
import { FlashcardsController } from './flashcards.controller';
import { AdminFlashcardsController } from './admin-flashcards.controller';
import { BooksService } from './books.service';
import { ChaptersService } from './chapters.service';
import { FlashcardsService } from './flashcards.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter, BookChunk, UploadedFile, Flashcard]), UploadModule],
  controllers: [
    BooksController,
    AdminBooksController,
    ChaptersController,
    AdminChaptersController,
    FlashcardsController,
    AdminFlashcardsController,
  ],
  providers: [BookProcessingService, BooksService, ChaptersService, FlashcardsService],
  exports: [BookProcessingService, BooksService, ChaptersService, FlashcardsService],
})
export class BooksModule {}
