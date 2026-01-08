import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Chapter } from './entities/chapter.entity';
import { BookChunk } from './entities/book-chunk.entity';
import { Flashcard } from './entities/flashcard.entity';
import { ReadingProgress } from './entities/reading-progress.entity';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { BookProcessingService } from './book-processing.service';
import { BooksService } from './books.service';
import { ChaptersService } from './chapters.service';
import { FlashcardsService } from './flashcards.service';
import { ReadingProgressService } from './reading-progress.service';
import { BooksController } from './books.controller';
import { AdminBooksController } from './admin-books.controller';
import { ChaptersController } from './chapters.controller';
import { AdminChaptersController } from './admin-chapters.controller';
import { FlashcardsController } from './flashcards.controller';
import { AdminFlashcardsController } from './admin-flashcards.controller';
import { ReadingProgressController, UserProgressController } from './controllers/reading-progress.controller';
import { UploadModule } from '../upload/upload.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      Chapter,
      BookChunk,
      UploadedFile,
      Flashcard,
      ReadingProgress,
    ]),
    UploadModule,
    QuizModule,
  ],
  controllers: [
    BooksController,
    AdminBooksController,
    ChaptersController,
    AdminChaptersController,
    FlashcardsController,
    AdminFlashcardsController,
    ReadingProgressController,
    UserProgressController,
  ],
  providers: [
    BookProcessingService,
    BooksService,
    ChaptersService,
    FlashcardsService,
    ReadingProgressService,
  ],
  exports: [
    BookProcessingService,
    BooksService,
    ChaptersService,
    FlashcardsService,
    ReadingProgressService,
  ],
})
export class BooksModule {}
