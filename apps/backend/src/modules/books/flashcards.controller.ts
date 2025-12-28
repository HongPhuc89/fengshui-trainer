import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FlashcardsService } from './flashcards.service';
import { GetRandomFlashcardsDto } from './dtos/get-random-flashcards.dto';
import { Flashcard } from './entities/flashcard.entity';

@ApiTags('Flashcards')
@Controller('books/:bookId/chapters/:chapterId/flashcards')
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all flashcards for a published chapter' })
  @ApiResponse({ status: 200, description: 'Return all flashcards for the published chapter.' })
  findAll(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
  ): Promise<Flashcard[]> {
    return this.flashcardsService.findAllByPublishedChapter(bookId, chapterId);
  }

  @Get('random')
  @ApiOperation({ summary: 'Get random flashcards from a published chapter' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of random cards (1-50, default: 20)' })
  @ApiResponse({ status: 200, description: 'Return random flashcards.' })
  getRandom(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Query() query: GetRandomFlashcardsDto,
  ): Promise<Flashcard[]> {
    return this.flashcardsService.getRandomFlashcards(bookId, chapterId, query.count);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flashcard by id from a published chapter' })
  @ApiResponse({ status: 200, description: 'Return the flashcard.' })
  findOne(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Flashcard> {
    return this.flashcardsService.findOneInPublishedChapter(bookId, chapterId, id);
  }
}
