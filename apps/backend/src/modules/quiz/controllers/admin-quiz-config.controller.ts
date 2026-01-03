import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { QuizConfigService } from '../services/quiz-config.service';
import { CreateQuizConfigDto, UpdateQuizConfigDto, QuizConfigResponseDto } from '../dtos/create-quiz-config.dto';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shares/guards/roles.guard';
import { Roles } from '../../../shares/decorators/roles.decorator';
import { UserRole } from '../../../shares/enums/user-role.enum';

@ApiTags('Admin - Quiz Configuration')
@ApiBearerAuth()
@Controller('admin/chapters/:chapterId/quiz-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminQuizConfigController {
  constructor(private readonly quizConfigService: QuizConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Create quiz configuration for a chapter' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quiz configuration created successfully',
    type: QuizConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Quiz config already exists for this chapter' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid difficulty distribution' })
  async create(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() createDto: CreateQuizConfigDto,
  ): Promise<QuizConfigResponseDto> {
    const config = await this.quizConfigService.create(chapterId, createDto);
    return this.quizConfigService.toResponseDto(config);
  }

  @Get()
  @ApiOperation({ summary: 'Get quiz configuration for a chapter' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz configuration retrieved successfully',
    type: QuizConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Quiz config not found' })
  async findByChapter(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<QuizConfigResponseDto> {
    const config = await this.quizConfigService.findByChapterId(chapterId);
    return this.quizConfigService.toResponseDto(config);
  }

  @Patch()
  @ApiOperation({ summary: 'Update quiz configuration for a chapter' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz configuration updated successfully',
    type: QuizConfigResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Quiz config not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid difficulty distribution' })
  async update(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() updateDto: UpdateQuizConfigDto,
  ): Promise<QuizConfigResponseDto> {
    const config = await this.quizConfigService.update(chapterId, updateDto);
    return this.quizConfigService.toResponseDto(config);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quiz configuration for a chapter' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Quiz configuration deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Quiz config not found' })
  async delete(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<void> {
    await this.quizConfigService.delete(chapterId);
  }

  @Post('default')
  @ApiOperation({ summary: 'Create default quiz configuration for a chapter' })
  @ApiParam({ name: 'chapterId', description: 'Chapter ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Default quiz configuration created successfully',
    type: QuizConfigResponseDto,
  })
  async createDefault(@Param('chapterId', ParseIntPipe) chapterId: number): Promise<QuizConfigResponseDto> {
    const config = await this.quizConfigService.createDefaultConfig(chapterId);
    return this.quizConfigService.toResponseDto(config);
  }
}
