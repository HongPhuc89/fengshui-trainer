import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ChaptersService } from './chapters.service';
import { FlashcardsService } from './flashcards.service';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';
import { ImportFlashcardsOptionsDto } from './dtos/import-flashcards-options.dto';
import { Chapter } from './entities/chapter.entity';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../shares/guards/roles.guard';
import { Roles } from '../../shares/decorators/roles.decorator';
import { UserRole } from '../../shares/enums/user-role.enum';

@ApiTags('Admin Chapters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/books/:bookId/chapters')
export class AdminChaptersController {
  constructor(
    private readonly chaptersService: ChaptersService,
    private readonly flashcardsService: FlashcardsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new chapter' })
  @ApiResponse({ status: 201, description: 'The chapter has been successfully created.' })
  create(@Param('bookId', ParseIntPipe) bookId: number, @Body() createChapterDto: CreateChapterDto): Promise<Chapter> {
    return this.chaptersService.create(bookId, createChapterDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all chapters for a book (all statuses)' })
  @ApiResponse({ status: 200, description: 'Return all chapters for the book.' })
  findAll(@Param('bookId', ParseIntPipe) bookId: number): Promise<Chapter[]> {
    return this.chaptersService.findAllByBook(bookId);
  }

  // Flashcard Import/Export endpoints (must be before :id routes)
  @Get('flashcards/template')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Download CSV template' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  async downloadTemplate(@Res() res: Response) {
    const csvContent = this.flashcardsService.generateTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flashcard-template.csv"');
    res.send(csvContent);
  }

  @Get(':chapterId/flashcards/export')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Export flashcards to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file content' })
  async exportFlashcards(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Res() res: Response,
  ) {
    const csvContent = await this.flashcardsService.exportToCSV(bookId, chapterId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="chapter-${chapterId}-flashcards.csv"`);
    res.send(csvContent);
  }

  @Post(':chapterId/flashcards/import/preview')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Preview CSV import' })
  @ApiResponse({ status: 200, description: 'Preview of flashcards to be imported' })
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.flashcardsService.previewImport(bookId, chapterId, csvContent);
  }

  @Post(':chapterId/flashcards/import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Import flashcards from CSV' })
  @ApiResponse({ status: 201, description: 'Flashcards imported successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async importFlashcards(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() options: ImportFlashcardsOptionsDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.flashcardsService.importFromCSV(bookId, chapterId, csvContent, options);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a chapter by id (any book status)' })
  @ApiResponse({ status: 200, description: 'Return the chapter.' })
  findOne(@Param('bookId', ParseIntPipe) bookId: number, @Param('id', ParseIntPipe) id: number): Promise<Chapter> {
    return this.chaptersService.findOne(bookId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a chapter' })
  @ApiResponse({ status: 200, description: 'The chapter has been successfully updated.' })
  update(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateChapterDto: UpdateChapterDto,
  ): Promise<Chapter> {
    return this.chaptersService.update(bookId, id, updateChapterDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Delete a chapter' })
  @ApiResponse({ status: 200, description: 'The chapter has been successfully deleted.' })
  async delete(@Param('bookId', ParseIntPipe) bookId: number, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.chaptersService.delete(bookId, id);
  }
}
