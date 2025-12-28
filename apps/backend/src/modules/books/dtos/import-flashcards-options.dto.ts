import { IsBoolean, IsOptional } from 'class-validator';

export class ImportFlashcardsOptionsDto {
  @IsOptional()
  @IsBoolean()
  skipDuplicates?: boolean = true;

  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean = true;

  @IsOptional()
  @IsBoolean()
  replaceDuplicates?: boolean = false;
}
