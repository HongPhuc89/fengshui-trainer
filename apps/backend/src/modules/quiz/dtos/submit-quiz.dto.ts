import { IsInt, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitQuizDto {
    @ApiProperty({ description: 'Quiz attempt ID' })
    @IsInt()
    attempt_id: number;

    @ApiProperty({ description: 'User answers { question_id: answer }' })
    @IsObject()
    answers: { [questionId: number]: any };
}
