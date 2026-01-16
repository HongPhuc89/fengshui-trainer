import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChapterDto {
  @ApiProperty({ description: 'Short title of the chapter', example: 'Introduction to Feng Shui' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Reward points for completing the chapter', example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  points: number;

  @ApiProperty({ description: 'Chapter content (optional)', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: 'Chapter order number (auto-assigned if not provided)', required: false })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiProperty({ description: 'File ID for chapter reading material (optional)', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  file_id?: number;

  @ApiProperty({ description: 'File ID for chapter infographic (optional)', required: false })
  @IsInt()
  @IsOptional()
  @Min(1)
  infographic_file_id?: number;
}
