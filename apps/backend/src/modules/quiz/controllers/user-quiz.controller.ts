import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuizAttemptsService } from '../services/quiz-attempts.service';
import { QuizConfigService } from '../services/quiz-config.service';
import { SubmitQuizDto } from '../dtos/submit-quiz.dto';
import { JwtAuthGuard } from '../../../shares/guards/jwt-auth.guard';

@ApiTags('User Quiz')
@ApiBearerAuth()
@Controller('books/:bookId/chapters/:chapterId/quiz')
@UseGuards(JwtAuthGuard)
export class UserQuizController {
    constructor(
        private readonly attemptsService: QuizAttemptsService,
        private readonly configService: QuizConfigService,
    ) { }

    @Get('info')
    @ApiOperation({ summary: 'Get quiz config info' })
    async getQuizInfo(@Param('chapterId', ParseIntPipe) chapterId: number) {
        return this.configService.findByChapterId(chapterId);
    }

    @Post('start')
    @ApiOperation({ summary: 'Start quiz - generates random questions' })
    async startQuiz(@Request() req, @Param('chapterId', ParseIntPipe) chapterId: number) {
        const userId = req.user.id;
        return this.attemptsService.startQuiz(userId, chapterId);
    }

    @Post('submit')
    @ApiOperation({ summary: 'Submit quiz answers' })
    async submitQuiz(@Request() req, @Body() submitDto: SubmitQuizDto) {
        const userId = req.user.id;
        return this.attemptsService.submitQuiz(userId, submitDto.attempt_id, submitDto.answers);
    }

    @Get('attempts')
    @ApiOperation({ summary: 'Get user attempt history' })
    async getAttempts(@Request() req, @Param('chapterId', ParseIntPipe) chapterId: number) {
        const userId = req.user.id;
        return this.attemptsService.getUserAttempts(userId, chapterId);
    }

    @Get('attempts/:attemptId')
    @ApiOperation({ summary: 'Get specific attempt with results' })
    async getAttempt(@Request() req, @Param('attemptId', ParseIntPipe) attemptId: number) {
        const userId = req.user.id;
        return this.attemptsService.getAttemptById(userId, attemptId);
    }
}
