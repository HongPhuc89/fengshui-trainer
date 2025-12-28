import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookStatus } from '../../../shares/enums/book-status.enum';

export class CreateBookDto {
  @ApiProperty({ example: 'The Great Gatsby' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'F. Scott Fitzgerald' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  cover_file_id?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  file_id?: number;

  @ApiPropertyOptional({ enum: BookStatus, default: BookStatus.DRAFT })
  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;
}
