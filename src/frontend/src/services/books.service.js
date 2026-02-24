import api from '../api/client'

export const booksService = {
  getCategories() {
    return api.get('books/categories/')
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
}
