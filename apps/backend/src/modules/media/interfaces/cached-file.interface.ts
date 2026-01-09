export interface CachedFile {
  fileId: number;
  path: string;
  size: number;
  lastAccessed: Date;
  cachedAt: Date;
}

export interface CacheMetadata {
  files: Record<string, CachedFile>;
  totalSize: number;
  maxSize: number;
}

export interface FileStreamResponse {
  stream: NodeJS.ReadableStream;
  contentType: string;
  filename: string;
  size: number;
}
