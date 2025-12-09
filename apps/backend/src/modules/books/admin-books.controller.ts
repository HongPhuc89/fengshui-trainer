import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dtos/create-book.dto';
import { UpdateBookDto } from './dtos/update-book.dto';
import { Book } from './entities/book.entity';
import { JwtAuthGuard } from '../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../shares/guards/roles.guard';
import { Roles } from '../../shares/decorators/roles.decorator';
import { UserRole } from '../../shares/enums/user-role.enum';
import { User as CurrentUser } from '../../shares/decorators/user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Admin Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/books')
export class AdminBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all books (all statuses)' })
  @ApiResponse({ status: 200, description: 'Return all books with any status.' })
  findAll(): Promise<Book[]> {
    return this.booksService.findAllAdmin();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get a book by id (any status)' })
  @ApiResponse({ status: 200, description: 'Return a book with any status.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Book> {
    return this.booksService.findOneAdmin(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new book' })
  @ApiResponse({ status: 201, description: 'The book has been successfully created.' })
  create(@Body() createBookDto: CreateBookDto, @CurrentUser() user: User): Promise<Book> {
    return this.booksService.create(createBookDto, user);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a book (full update)' })
  @ApiResponse({ status: 200, description: 'The book has been successfully updated.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto): Promise<Book> {
    return this.booksService.update(id, updateBookDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a book (partial update)' })
  @ApiResponse({ status: 200, description: 'The book has been successfully updated.' })
  patch(@Param('id', ParseIntPipe) id: number, @Body() updateBookDto: UpdateBookDto): Promise<Book> {
    return this.booksService.update(id, updateBookDto);
  }
}
