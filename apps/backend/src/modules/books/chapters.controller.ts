import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
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
  findAll(@Param('bookId', ParseIntPipe) bookId: number, @Req() req: Request): Promise<Chapter[]> {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.chaptersService.findAllByPublishedBook(bookId, baseUrl);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chapter by id from a published book' })
  @ApiResponse({ status: 200, description: 'Return the chapter.' })
  findOne(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<Chapter> {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.chaptersService.findOneInPublishedBook(bookId, id, baseUrl);
  }
}
