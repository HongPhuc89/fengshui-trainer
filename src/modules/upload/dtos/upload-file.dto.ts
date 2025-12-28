import { IsEnum, IsNotEmpty } from 'class-validator';
import { FileType } from '../../../shares/enums/file-type.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({ enum: FileType })
  @IsNotEmpty()
  @IsEnum(FileType)
  type: FileType;
}
