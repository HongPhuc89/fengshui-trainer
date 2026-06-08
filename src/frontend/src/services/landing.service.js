import api from '../api/client'

const CACHE_30M = { ttl: 30 * 60 * 1000 }

export const landingService = {
  getBookIntroPage() {
    return api.get('landing/book-intro/', { cache: CACHE_30M })
  },
}
