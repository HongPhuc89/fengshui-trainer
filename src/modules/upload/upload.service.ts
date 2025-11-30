import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UploadedFile } from './entities/uploaded-file.entity';
import { FileType } from '../../shares/enums/file-type.enum';
import { User } from 'src/modules/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import 'multer';

@Injectable()
export class UploadService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(
    @InjectRepository(UploadedFile)
    private uploadedFileRepository: Repository<UploadedFile>,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_BUCKET', 'books');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  async uploadFile(file: any, type: FileType, user: User): Promise<UploadedFile> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    // Validate file type
    if (type === FileType.BOOK) {
      const allowedMimes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/epub+zip',
        'text/markdown',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid book file format');
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new BadRequestException('Book file size exceeds 20MB');
      }
    } else if (type === FileType.COVER) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid cover image format');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('Cover image size exceeds 5MB');
      }
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `${type}s/${fileName}`; // e.g. books/uuid.pdf or covers/uuid.jpg

    const { error } = await this.supabase.storage.from(this.bucketName).upload(filePath, file.buffer, {
      contentType: file.mimetype,
    });

    if (error) {
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage.from(this.bucketName).getPublicUrl(filePath);

    const uploadedFile = this.uploadedFileRepository.create({
      user_id: user.id,
      type,
      original_name: file.originalname,
      filename: fileName,
      path: publicUrlData.publicUrl,
      mimetype: file.mimetype,
      size: file.size,
    });

    return this.uploadedFileRepository.save(uploadedFile);
  }
}
