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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FlashcardsService, ImportResult } from './flashcards.service';
import { CreateFlashcardDto } from './dtos/create-flashcard.dto';
import { UpdateFlashcardDto } from './dtos/update-flashcard.dto';
import { Flashcard } from './entities/flashcard.entity';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../shares/guards/roles.guard';
import { Roles } from '../../shares/decorators/roles.decorator';
import { UserRole } from '../../shares/enums/user-role.enum';

@ApiTags('Admin Flashcards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/books/:bookId/chapters/:chapterId/flashcards')
export class AdminFlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new flashcard' })
  @ApiResponse({ status: 201, description: 'The flashcard has been successfully created.' })
  create(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() createFlashcardDto: CreateFlashcardDto,
  ): Promise<Flashcard> {
    return this.flashcardsService.create(bookId, chapterId, createFlashcardDto);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import flashcards from CSV file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Flashcards have been successfully imported.' })
  async importFromCSV(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @UploadedFile() file: any,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are allowed');
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.flashcardsService.importFromCSV(bookId, chapterId, csvContent);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all flashcards for a chapter (all book statuses)' })
  @ApiResponse({ status: 200, description: 'Return all flashcards for the chapter.' })
  findAll(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<Flashcard[]> {
    return this.flashcardsService.findAllByChapter(bookId, chapterId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a flashcard by id (any book status)' })
  @ApiResponse({ status: 200, description: 'Return the flashcard.' })
  findOne(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Flashcard> {
    return this.flashcardsService.findOne(bookId, chapterId, id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a flashcard' })
  @ApiResponse({ status: 200, description: 'The flashcard has been successfully updated.' })
  update(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFlashcardDto: UpdateFlashcardDto,
  ): Promise<Flashcard> {
    return this.flashcardsService.update(bookId, chapterId, id, updateFlashcardDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Delete a flashcard' })
  @ApiResponse({ status: 200, description: 'The flashcard has been successfully deleted.' })
  async delete(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.flashcardsService.delete(bookId, chapterId, id);
  }
}
