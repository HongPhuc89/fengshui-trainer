import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadedFile } from './entities/uploaded-file.entity';
import { ConfigModule } from '@nestjs/config';
import { MediaUrlHelper } from '../../shares/helpers/media-url.helper';

@Module({
  imports: [TypeOrmModule.forFeature([UploadedFile]), ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, MediaUrlHelper],
  exports: [UploadService, MediaUrlHelper],
})
export class UploadModule {}
