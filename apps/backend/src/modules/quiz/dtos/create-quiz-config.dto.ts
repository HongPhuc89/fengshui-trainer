import { IsString, IsInt, IsBoolean, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizConfigDto {
    @ApiProperty({ description: 'Quiz title', example: 'Chapter 1 Quiz' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ description: 'Quiz description/instructions', example: 'Test your knowledge of Chapter 1' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Number of questions per quiz', default: 10, minimum: 1, maximum: 100 })
    @IsInt()
    @Min(1)
    @Max(100)
    questions_per_quiz: number;

    @ApiProperty({ description: 'Time limit in minutes', default: 30, minimum: 1, maximum: 300 })
    @IsInt()
    @Min(1)
    @Max(300)
    time_limit_minutes: number;

    @ApiProperty({ description: 'Passing score percentage (0-100)', default: 70, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    passing_score_percentage: number;

    @ApiProperty({ description: 'Percentage of easy questions (0-100)', default: 40, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    easy_percentage: number;

    @ApiProperty({ description: 'Percentage of medium questions (0-100)', default: 40, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    medium_percentage: number;

    @ApiProperty({ description: 'Percentage of hard questions (0-100)', default: 20, minimum: 0, maximum: 100 })
    @IsInt()
    @Min(0)
    @Max(100)
    hard_percentage: number;

    @ApiPropertyOptional({ description: 'Is quiz active', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Shuffle questions order', default: false })
    @IsOptional()
    @IsBoolean()
    shuffle_questions?: boolean;

    @ApiPropertyOptional({ description: 'Shuffle answer options', default: true })
    @IsOptional()
    @IsBoolean()
    shuffle_options?: boolean;

    @ApiPropertyOptional({ description: 'Show results immediately after submission', default: true })
    @IsOptional()
    @IsBoolean()
    show_results_immediately?: boolean;

    @ApiPropertyOptional({ description: 'Maximum number of attempts (0 = unlimited)', default: 0, minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    max_attempts?: number;
}

export class UpdateQuizConfigDto {
    @ApiPropertyOptional({ description: 'Quiz title' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;

    @ApiPropertyOptional({ description: 'Quiz description/instructions' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Number of questions per quiz', minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    questions_per_quiz?: number;

    @ApiPropertyOptional({ description: 'Time limit in minutes', minimum: 1, maximum: 300 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(300)
    time_limit_minutes?: number;

    @ApiPropertyOptional({ description: 'Passing score percentage (0-100)', minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    passing_score_percentage?: number;

    @ApiPropertyOptional({ description: 'Percentage of easy questions (0-100)', minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    easy_percentage?: number;

    @ApiPropertyOptional({ description: 'Percentage of medium questions (0-100)', minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    medium_percentage?: number;

    @ApiPropertyOptional({ description: 'Percentage of hard questions (0-100)', minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    hard_percentage?: number;

    @ApiPropertyOptional({ description: 'Is quiz active' })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Shuffle questions order' })
    @IsOptional()
    @IsBoolean()
    shuffle_questions?: boolean;

    @ApiPropertyOptional({ description: 'Shuffle answer options' })
    @IsOptional()
    @IsBoolean()
    shuffle_options?: boolean;

    @ApiPropertyOptional({ description: 'Show results immediately after submission' })
    @IsOptional()
    @IsBoolean()
    show_results_immediately?: boolean;

    @ApiPropertyOptional({ description: 'Maximum number of attempts (0 = unlimited)', minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    max_attempts?: number;
}

export class QuizConfigResponseDto {
    id: number;
    chapter_id: number;
    title: string;
    description: string;
    questions_per_quiz: number;
    time_limit_minutes: number;
    passing_score_percentage: number;
    easy_percentage: number;
    medium_percentage: number;
    hard_percentage: number;
    is_active: boolean;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_results_immediately: boolean;
    max_attempts: number;
    created_at: Date;
    updated_at: Date;
}
