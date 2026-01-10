import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConfig } from './utils';

/**
 * Utility service for generating media proxy URLs
 * Centralizes URL generation logic to avoid duplication
 */
@Injectable()
export class MediaUrlHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate media proxy URL for a file
   * Returns full URL if baseUrl is provided, otherwise relative
   *
   * @param fileId - File ID from uploaded_files table
   * @param baseUrl - Optional base URL (protocol + host)
   * @returns Media proxy URL
   */
  getMediaUrl(fileId: number, baseUrl?: string): string {
    if (!fileId) {
      return null;
    }

    const config = getConfig();
    const apiPrefix = baseUrl ? '' : config.app?.prefix || 'api';
    const hostUrl = baseUrl || config.app?.url || '';

    const path = `/${apiPrefix}/media/${fileId}`.replace(/\/+/g, '/');

    return hostUrl ? `${hostUrl}${path}` : path;
  }

  /**
   * Attach media URLs to a file object
   *
   * @param file - File object with id property
   * @param baseUrl - Optional base URL
   * @returns Modified file object
   */
  attachMediaUrl<T extends { id: number; path?: string }>(file: T, baseUrl?: string): T {
    if (file?.id) {
      file.path = this.getMediaUrl(file.id, baseUrl);
    }
    return file;
  }

  /**
   * Attach media URLs to multiple file objects
   *
   * @param files - Array of file objects
   * @param baseUrl - Optional base URL
   * @returns Array with modified path properties
   */
  attachMediaUrls<T extends { id: number; path?: string }>(files: T[], baseUrl?: string): T[] {
    return files?.map((file) => this.attachMediaUrl(file, baseUrl)) || [];
  }
}
