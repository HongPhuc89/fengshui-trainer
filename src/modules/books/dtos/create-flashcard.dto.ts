import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlashcardDto {
  @ApiProperty({ description: 'Flashcard question (front)', example: 'What is Feng Shui?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'Flashcard answer (back)', example: 'Ancient Chinese practice of harmonizing energy' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}
