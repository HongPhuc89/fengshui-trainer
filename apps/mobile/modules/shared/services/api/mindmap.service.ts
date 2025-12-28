import { apiClient } from './client';
import { MindMap } from './types';

class MindMapService {
  /**
   * Get mind map for a chapter
   */
  async getMindMapByChapter(bookId: number, chapterId: number): Promise<MindMap> {
    return apiClient.get<MindMap>(`/books/${bookId}/chapters/${chapterId}/mindmap`);
  }

  /**
   * Export mind map as JSON
   * Note: This returns the raw response for downloading
   */
  async exportMindMap(bookId: number, chapterId: number): Promise<any> {
    return apiClient.get(`/books/${bookId}/chapters/${chapterId}/mindmap/export`);
  }
}

export const mindMapService = new MindMapService();
