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
    if (type === FileType.BOOK || type === FileType.CHAPTER) {
      const allowedMimes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/epub+zip',
        'text/markdown',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(`Invalid ${type} file format`);
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new BadRequestException(`${type} file size exceeds 20MB`);
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

    // Store the storage path instead of signed URL
    // Signed URLs will be generated on-demand to avoid expiration issues
    const uploadedFile = this.uploadedFileRepository.create({
      user_id: user.id,
      type,
      original_name: file.originalname,
      filename: fileName,
      path: filePath, // Store path like "chapters/uuid.pdf"
      mimetype: file.mimetype,
      size: file.size,
    });

    return this.uploadedFileRepository.save(uploadedFile);
  }

  /**
   * Generate a signed URL for private file access
   * @param filePath - The storage path of the file (e.g., 'covers/uuid.webp')
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL with expiration
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    const { data, error } = await this.supabase.storage.from(this.bucketName).createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new InternalServerErrorException(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Extract the storage path from a full Supabase URL
   * @param fullUrl - Full Supabase storage URL
   * @returns Storage path (e.g., 'covers/uuid.webp')
   */
  extractPathFromUrl(fullUrl: string): string {
    // URL format: https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/public/books/covers/uuid.webp
    const match = fullUrl.match(/\/object\/public\/[^/]+\/(.+)$/);
    if (match && match[1]) {
      return match[1];
    }

    // If URL doesn't match expected format, throw error
    throw new BadRequestException('Invalid Supabase storage URL format');
  }

  /**
   * Generate a fresh signed URL for an uploaded file
   * This is used to avoid expired URL issues when fetching file data
   * @param file - UploadedFile entity
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Fresh signed URL
   */
  async getFileUrl(file: any, expiresIn: number = 3600): Promise<string> {
    if (!file || !file.path) {
      return null;
    }

    // If path is already a full URL (old data), extract the storage path
    let storagePath = file.path;
    if (storagePath.startsWith('http')) {
      try {
        storagePath = this.extractPathFromUrl(storagePath);
      } catch (error) {
        // If extraction fails, return the original path
        return storagePath;
      }
    }

    // Generate fresh signed URL
    try {
      return await this.getSignedUrl(storagePath, expiresIn);
    } catch (error) {
      // If signed URL generation fails, return the storage path
      return storagePath;
    }
  }
}
