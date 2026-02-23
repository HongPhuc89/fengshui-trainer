import api from '../api/client'

export const walletService = {
  getBalance() {
    return api.get('wallet/me/')
  },
}
