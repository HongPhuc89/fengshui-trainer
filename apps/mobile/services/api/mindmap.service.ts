import { apiClient } from './client';
import { MindMap } from '../../types/mindmap';

class MindmapService {
  async getMindmapByChapter(bookId: number, chapterId: number): Promise<MindMap> {
    const url = `/books/${bookId}/chapters/${chapterId}/mindmap`;
    console.log('🗺️ Fetching mindmap from:', url);
    return apiClient.get<MindMap>(url);
  }

  async exportMindmap(bookId: number, chapterId: number): Promise<Blob> {
    const url = `/books/${bookId}/chapters/${chapterId}/mindmap/export`;
    return apiClient.get<Blob>(url, {
      responseType: 'blob',
    });
  }
}

export const mindmapService = new MindmapService();
