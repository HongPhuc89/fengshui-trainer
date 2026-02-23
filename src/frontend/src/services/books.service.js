import api from '../api/client'

export const booksService = {
  getBooks() {
    return api.get('books/')
  },
}
