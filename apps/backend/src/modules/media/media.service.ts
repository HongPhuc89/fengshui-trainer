import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { SupabaseService } from '../supabase/supabase.service';
import { FileStreamResponse, CacheMetadata, CachedFile } from './interfaces/cached-file.interface';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly cacheDir: string;
  private readonly cacheEnabled: boolean;
  private readonly maxCacheSize: number;
  private readonly metadataFile: string;

  constructor(
    @InjectRepository(UploadedFile)
    private uploadedFileRepository: Repository<UploadedFile>,
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {
    this.cacheEnabled = this.configService.get<boolean>('MEDIA_CACHE_ENABLED', true);
    this.cacheDir = this.configService.get<string>('MEDIA_CACHE_DIR', './storage/media-cache');
    const maxCacheSizeGB = this.configService.get<number>('MEDIA_CACHE_MAX_SIZE_GB', 10);
    this.maxCacheSize = maxCacheSizeGB * 1024 * 1024 * 1024; // Convert GB to bytes
    this.metadataFile = join(this.cacheDir, '.cache-metadata.json');

    // Ensure cache directory exists
    if (this.cacheEnabled && !existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
      this.logger.log(`Created cache directory: ${this.cacheDir}`);
    }
  }

  async getFile(fileId: number): Promise<FileStreamResponse> {
    // 1. Get file metadata from database
    const file = await this.uploadedFileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    this.logger.log(`Fetching file: ${file.filename} (ID: ${fileId})`);

    // 2. Check cache if enabled
    if (this.cacheEnabled) {
      const cachedPath = this.getCachedFilePath(file.path);
      if (existsSync(cachedPath)) {
        this.logger.log(`Cache HIT for file: ${file.filename}`);
        this.updateCacheMetadata(fileId, file.path, file.size);
        return {
          stream: createReadStream(cachedPath),
          contentType: file.mimetype,
          filename: file.original_name,
          size: file.size,
        };
      }
      this.logger.log(`Cache MISS for file: ${file.filename}`);
    }

    // 3. Download from Supabase
    const buffer = await this.downloadFromSupabase(file.path);

    // 4. Save to cache if enabled
    if (this.cacheEnabled) {
      await this.saveToCache(fileId, file.path, buffer, file.size);
    }

    // 5. Return file stream
    const cachedPath = this.getCachedFilePath(file.path);
    return {
      stream: createReadStream(cachedPath),
      contentType: file.mimetype,
      filename: file.original_name,
      size: file.size,
    };
  }

  private getCachedFilePath(supabasePath: string): string {
    const hash = createHash('md5').update(supabasePath).digest('hex');
    const ext = supabasePath.split('.').pop() || 'bin';
    return join(this.cacheDir, `${hash}.${ext}`);
  }

  private async downloadFromSupabase(path: string): Promise<Buffer> {
    try {
      this.logger.log(`Downloading from Supabase: ${path}`);

      // Extract bucket and file path
      const bucket = this.configService.get<string>('SUPABASE_BUCKET', 'books');

      // Get signed URL and download
      const signedUrl = await this.supabaseService.getSignedUrl(bucket, path, 60);

      // Download file using fetch
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error(`Failed to download from Supabase: ${error.message}`);
      throw new InternalServerErrorException('Failed to download file from storage');
    }
  }

  private async saveToCache(fileId: number, path: string, buffer: Buffer, size: number): Promise<void> {
    try {
      // Check if we need to evict files
      await this.evictIfNeeded(size);

      // Save file
      const cachedPath = this.getCachedFilePath(path);
      writeFileSync(cachedPath, buffer);
      this.logger.log(`Saved to cache: ${cachedPath}`);

      // Update metadata
      this.updateCacheMetadata(fileId, path, size);
    } catch (error) {
      this.logger.error(`Failed to save to cache: ${error.message}`);
      // Don't throw - caching is optional
    }
  }

  private loadMetadata(): CacheMetadata {
    if (!existsSync(this.metadataFile)) {
      return {
        files: {},
        totalSize: 0,
        maxSize: this.maxCacheSize,
      };
    }

    try {
      const data = readFileSync(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Failed to load metadata: ${error.message}`);
      return {
        files: {},
        totalSize: 0,
        maxSize: this.maxCacheSize,
      };
    }
  }

  private saveMetadata(metadata: CacheMetadata): void {
    try {
      writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      this.logger.error(`Failed to save metadata: ${error.message}`);
    }
  }

  private updateCacheMetadata(fileId: number, path: string, size: number): void {
    const metadata = this.loadMetadata();
    const key = this.getCacheKey(path);

    if (metadata.files[key]) {
      // Update last accessed
      metadata.files[key].lastAccessed = new Date();
    } else {
      // Add new entry
      metadata.files[key] = {
        fileId,
        path,
        size,
        lastAccessed: new Date(),
        cachedAt: new Date(),
      };
      metadata.totalSize += size;
    }

    this.saveMetadata(metadata);
  }

  private async evictIfNeeded(newFileSize: number): Promise<void> {
    const metadata = this.loadMetadata();

    if (metadata.totalSize + newFileSize <= metadata.maxSize) {
      return; // No eviction needed
    }

    this.logger.log(`Cache full, evicting old files...`);

    // Sort by last accessed (oldest first)
    const sortedFiles = Object.entries(metadata.files).sort(
      ([, a], [, b]) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime(),
    );

    let freedSpace = 0;
    const toRemove: string[] = [];

    for (const [key, file] of sortedFiles) {
      if (metadata.totalSize - freedSpace + newFileSize <= metadata.maxSize) {
        break; // Enough space freed
      }

      toRemove.push(key);
      freedSpace += file.size;

      // Delete physical file
      const cachedPath = this.getCachedFilePath(file.path);
      if (existsSync(cachedPath)) {
        unlinkSync(cachedPath);
        this.logger.log(`Evicted: ${file.path}`);
      }
    }

    // Update metadata
    for (const key of toRemove) {
      delete metadata.files[key];
    }
    metadata.totalSize -= freedSpace;
    this.saveMetadata(metadata);

    this.logger.log(`Evicted ${toRemove.length} files, freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
  }

  private getCacheKey(path: string): string {
    return createHash('md5').update(path).digest('hex');
  }
}
