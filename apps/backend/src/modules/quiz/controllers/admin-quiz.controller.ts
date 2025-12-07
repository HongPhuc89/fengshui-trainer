import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizConfigService } from '../services/quiz-config.service';
import { QuestionBankService } from '../services/question-bank.service';
import { CreateQuizConfigDto } from '../dtos/create-quiz-config.dto';
import { CreateQuestionDto } from '../dtos/create-question.dto';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shares/guards/roles.guard';
import { Roles } from '../../../shares/decorators/roles.decorator';
import { UserRole } from '../../../shares/enums/user-role.enum';

@ApiTags('Admin Quiz')
@ApiBearerAuth()
@Controller('admin/chapters/:chapterId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminQuizController {
  constructor(
    private readonly configService: QuizConfigService,
    private readonly questionBankService: QuestionBankService,
  ) {}

  // Quiz Configuration Endpoints
  @Post('quiz-config')
  @ApiOperation({ summary: 'Create quiz config for chapter' })
  async createConfig(@Param('chapterId', ParseIntPipe) chapterId: number, @Body() createDto: CreateQuizConfigDto) {
    return this.configService.create(chapterId, createDto);
  }

  @Get('quiz-config')
  @ApiOperation({ summary: 'Get quiz config' })
  async getConfig(@Param('chapterId', ParseIntPipe) chapterId: number) {
    return this.configService.findByChapterId(chapterId);
  }

  @Put('quiz-config')
  @ApiOperation({ summary: 'Update quiz config' })
  async updateConfig(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body() updateDto: Partial<CreateQuizConfigDto>,
  ) {
    return this.configService.update(chapterId, updateDto);
  }

  @Delete('quiz-config')
  @ApiOperation({ summary: 'Delete quiz config' })
  async deleteConfig(@Param('chapterId', ParseIntPipe) chapterId: number) {
    await this.configService.delete(chapterId);
    return { message: 'Quiz config deleted successfully' };
  }

  // Question Bank Endpoints
  @Get('questions')
  @ApiOperation({ summary: 'Get all questions in chapter' })
  async getQuestions(@Param('chapterId', ParseIntPipe) chapterId: number) {
    return this.questionBankService.findAllByChapter(chapterId);
  }

  @Post('questions')
  @ApiOperation({ summary: 'Add question to chapter' })
  async createQuestion(@Param('chapterId', ParseIntPipe) chapterId: number, @Body() createDto: CreateQuestionDto) {
    return this.questionBankService.create(chapterId, createDto);
  }

  @Put('questions/:questionId')
  @ApiOperation({ summary: 'Update question' })
  async updateQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() updateDto: Partial<CreateQuestionDto>,
  ) {
    return this.questionBankService.update(questionId, updateDto);
  }

  @Delete('questions/:questionId')
  @ApiOperation({ summary: 'Delete question' })
  async deleteQuestion(@Param('questionId', ParseIntPipe) questionId: number) {
    await this.questionBankService.delete(questionId);
    return { message: 'Question deleted successfully' };
  }

  @Get('questions/export/csv')
  @ApiOperation({ summary: 'Export questions to CSV' })
  async exportQuestionsCSV(@Param('chapterId', ParseIntPipe) chapterId: number) {
    const csv = await this.questionBankService.exportToCSV(chapterId);
    return {
      filename: `questions_chapter_${chapterId}.csv`,
      content: csv,
    };
  }

  @Post('questions/import/csv')
  @ApiOperation({ summary: 'Import questions from CSV' })
  async importQuestionsCSV(
    @Param('chapterId', ParseIntPipe) chapterId: number,
    @Body('csv_content') csvContent: string,
  ) {
    return this.questionBankService.importFromCSV(chapterId, csvContent);
  }
}
