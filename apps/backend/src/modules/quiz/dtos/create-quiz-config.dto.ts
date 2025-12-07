import { IsString, IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizConfigDto {
    @ApiProperty({ description: 'Quiz title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Quiz description/instructions' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Number of questions per quiz', default: 10 })
    @IsInt()
    @Min(1)
    questions_per_quiz: number;

    @ApiProperty({ description: 'Passing score percentage (0-100)', default: 70 })
    @IsInt()
    @Min(0)
    @Max(100)
    passing_score_percentage: number;

    @ApiPropertyOptional({ description: 'Time limit in minutes' })
    @IsOptional()
    @IsInt()
    @Min(1)
    time_limit_minutes?: number;

    @ApiProperty({ description: 'Is quiz active', default: true })
    @IsBoolean()
    is_active: boolean;
}
