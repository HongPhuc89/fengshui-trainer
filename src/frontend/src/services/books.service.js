import api from '../api/client'

const CACHE_12H = { ttl: 12 * 60 * 60 * 1000 }
const CACHE_1H = { ttl: 60 * 60 * 1000 }
const CACHE_5M = { ttl: 5 * 60 * 1000 }

export const booksService = {
  getCategories() {
    return api.get('books/categories/', { cache: CACHE_12H })
  },

  getRecentlyRead() {
    return api.get('books/recently-read/', { cache: CACHE_5M })
  },

  getBooks(params = {}) {
    return api.get('books/', { params, cache: CACHE_1H })
  },

  getBookDetail(slug) {
    return api.get(`books/${slug}/`, { cache: CACHE_1H })
  },

  // No cache: DRM content — watermarked per user, must not be stored on disk
  getChapter(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/`)
  },

  // No cache: real-time reading progress
  getBookProgress(slug) {
    return api.get(`books/${slug}/progress/`)
  },

  saveChapterProgress(bookSlug, order, data) {
    return api.post(`books/${bookSlug}/chapters/${order}/progress/`, data)
  },

  // No cache: security config must be fresh
  getWatermarkConfig(bookSlug, order) {
    return api.get(`books/${bookSlug}/chapters/${order}/watermark-config/`)
  },

  purchaseBook(bookId) {
    return api.post('payments/purchase-book/', { book_id: bookId })
  },
}
