import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { Chapter } from './entities/chapter.entity';

@ApiTags('Chapters')
@Controller('books/:bookId/chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all chapters for a published book' })
  @ApiResponse({ status: 200, description: 'Return all chapters for the published book.' })
  findAll(@Param('bookId', ParseIntPipe) bookId: number): Promise<Chapter[]> {
    return this.chaptersService.findAllByPublishedBook(bookId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chapter by id from a published book' })
  @ApiResponse({ status: 200, description: 'Return the chapter.' })
  findOne(@Param('bookId', ParseIntPipe) bookId: number, @Param('id', ParseIntPipe) id: number): Promise<Chapter> {
    return this.chaptersService.findOneInPublishedBook(bookId, id);
  }
}
