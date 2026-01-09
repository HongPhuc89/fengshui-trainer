import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'List all books' })
  @ApiResponse({ status: 200, description: 'Return all books.' })
  findAll(@Req() req: Request): Promise<Book[]> {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.booksService.findAll(baseUrl);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a book by id' })
  @ApiResponse({ status: 200, description: 'Return a book.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request): Promise<Book> {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.booksService.findOne(id, baseUrl);
  }
}
