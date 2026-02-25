import api from '../api/client'

export const booksService = {
  getCategories() {
    return api.get('books/categories/')
  },

  getRecentlyRead() {
    return api.get('books/recently-read/')
  },

  getBooks(params = {}) {
    return api.get('books/', { params })
  },

  getBookDetail(slug) {
    return api.get(`books/${slug}/`)
  },

  getChapter(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/`)
  },

  getBookProgress(slug) {
    return api.get(`books/${slug}/progress/`)
  },

  saveChapterProgress(bookSlug, order, data) {
    return api.post(`books/${bookSlug}/chapters/${order}/progress/`, data)
  },

  getWatermarkConfig(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/watermark-config/`)
  },
}
