import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Upload file to Supabase Storage
   * @param bucket - Bucket name (e.g., 'avatars', 'books')
   * @param path - File path within bucket (e.g., 'user_1/avatar.jpg')
   * @param buffer - File buffer
   * @param contentType - MIME type
   * @returns File path in storage
   */
  async uploadFile(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    const { error } = await this.supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false, // Don't overwrite existing files
    });

    if (error) {
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }

    return path;
  }

  /**
   * Delete file from Supabase Storage
   * @param bucket - Bucket name
   * @param path - File path within bucket
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new InternalServerErrorException(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for private file access
   * @param bucket - Bucket name
   * @param path - File path within bucket
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL with expiration
   */
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    const { data, error } = await this.supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) {
      throw new InternalServerErrorException(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Get public URL for a file (for public buckets)
   * @param bucket - Bucket name
   * @param path - File path within bucket
   * @returns Public URL
   */
  getPublicUrl(bucket: string, path: string): string {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage service not configured');
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
