import { IsEnum, IsString, IsInt, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '../../../shares/enums/question-type.enum';
import { DifficultyLevel } from '../../../shares/enums/difficulty-level.enum';

export class CreateQuestionDto {
  @ApiProperty({ enum: QuestionType, description: 'Question type' })
  @IsEnum(QuestionType)
  question_type: QuestionType;

  @ApiProperty({ enum: DifficultyLevel, description: 'Difficulty level' })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ description: 'Question text' })
  @IsString()
  question_text: string;

  @ApiProperty({ description: 'Points for correct answer', default: 1 })
  @IsInt()
  @Min(1)
  points: number;

  @ApiProperty({ description: 'Question options (JSON structure depends on question type)' })
  @IsObject()
  options: any;

  @ApiPropertyOptional({ description: 'Explanation shown after answering' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Illustration file ID from UploadedFile entity' })
  @IsOptional()
  @IsInt()
  illustration_file_id?: number;
}
