import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { Chapter } from './entities/chapter.entity';
import { BookChunk } from './entities/book-chunk.entity';
import { BookProcessingService } from './book-processing.service';
import { UploadModule } from '../upload/upload.module';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter, BookChunk, UploadedFile]), UploadModule],
  providers: [BookProcessingService],
  exports: [BookProcessingService],
})
export class BooksModule {}
