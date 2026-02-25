import api from '../api/client'

export const walletService = {
  getBalance() {
    return api.get('wallet/me/')
  },
  getTransactions(params = {}) {
    return api.get('wallet/history/', { params })
  },
}
