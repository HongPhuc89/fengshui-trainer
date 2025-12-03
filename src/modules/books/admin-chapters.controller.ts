import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dtos/create-chapter.dto';
import { UpdateChapterDto } from './dtos/update-chapter.dto';
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
  constructor(private readonly chaptersService: ChaptersService) {}

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
