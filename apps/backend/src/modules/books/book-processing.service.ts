import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookChunk } from './entities/book-chunk.entity';
import { Book } from './entities/book.entity';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class BookProcessingService {
  constructor(
    @InjectRepository(BookChunk)
    private bookChunkRepository: Repository<BookChunk>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
    @InjectRepository(UploadedFile)
    private uploadedFileRepository: Repository<UploadedFile>,
  ) {}

  async processBook(bookId: number): Promise<void> {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['file'],
    });

    if (!book || !book.file) {
      throw new InternalServerErrorException('Book or file not found');
    }

    try {
      // Parse the file
      const text = await this.parseFile(book.file);

      // Chunk the text
      const chunks = await this.chunkText(text);

      // Save chunks
      await this.saveChunks(bookId, chunks);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to process book: ${error.message}`);
    }
  }

  private async parseFile(file: UploadedFile): Promise<string> {
    const buffer = await this.downloadFile(file.path);

    if (file.mimetype === 'application/pdf') {
      const data = await (pdfParse as any).default(buffer);
      return data.text;
    } else if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
      return buffer.toString('utf-8');
    }

    throw new InternalServerErrorException(`Unsupported file type: ${file.mimetype}`);
  }

  private async downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      protocol.get(url, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });
    });
  }

  private async chunkText(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);
    return docs.map((doc) => doc.pageContent);
  }

  private async saveChunks(bookId: number, chunks: string[]): Promise<void> {
    // Delete existing chunks
    await this.bookChunkRepository.delete({ book_id: bookId });

    // Create new chunks
    const chunkEntities = chunks.map((content, index) =>
      this.bookChunkRepository.create({
        book_id: bookId,
        content,
        chunk_index: index,
        metadata: {},
      }),
    );

    await this.bookChunkRepository.save(chunkEntities);
  }
}
