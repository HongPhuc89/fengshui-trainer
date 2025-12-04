import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetRandomFlashcardsDto {
  @ApiProperty({
    description: 'Number of random flashcards to return',
    example: 5,
    minimum: 1,
    maximum: 50,
    required: false,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number = 5;
}
