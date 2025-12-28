import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizSessionService } from '../services/quiz-session.service';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';

@ApiTags('Quiz Sessions')
@ApiBearerAuth()
@Controller('quiz-sessions')
@UseGuards(JwtAuthGuard)
export class QuizSessionController {
  constructor(private readonly sessionService: QuizSessionService) {}

  @Post('start/:chapterId')
  @ApiOperation({ summary: 'Start a new quiz session' })
  async startQuiz(@Req() req: any, @Param('chapterId', ParseIntPipe) chapterId: number) {
    const userId = req.user.id;
    return this.sessionService.startQuiz(userId, chapterId);
  }

  @Post(':sessionId/answer')
  @ApiOperation({ summary: 'Submit an answer for a question' })
  async submitAnswer(
    @Req() req: any,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { question_id: number; answer: any },
  ) {
    const userId = req.user.id;
    return this.sessionService.submitAnswer(sessionId, userId, body.question_id, body.answer);
  }

  @Post(':sessionId/complete')
  @ApiOperation({ summary: 'Complete quiz and get results' })
  async completeQuiz(@Req() req: any, @Param('sessionId', ParseIntPipe) sessionId: number) {
    const userId = req.user.id;
    return this.sessionService.completeQuiz(sessionId, userId);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get quiz session details' })
  async getSession(@Req() req: any, @Param('sessionId', ParseIntPipe) sessionId: number) {
    const userId = req.user.id;
    return this.sessionService.getSession(sessionId, userId);
  }

  @Get('chapter/:chapterId/history')
  @ApiOperation({ summary: 'Get user quiz history for a chapter' })
  async getHistory(@Req() req: any, @Param('chapterId', ParseIntPipe) chapterId: number) {
    const userId = req.user.id;
    return this.sessionService.getUserSessions(userId, chapterId);
  }

  @Get('my-sessions')
  @ApiOperation({ summary: 'Get all user quiz sessions' })
  async getMySessions(@Req() req: any) {
    const userId = req.user.id;
    return this.sessionService.getUserSessions(userId);
  }
}
