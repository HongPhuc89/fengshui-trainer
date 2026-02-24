import api from '../api/client'

export const walletService = {
  getBalance() {
    return api.get('wallet/me/')
  },
  getTransactions(params = {}) {
    return api.get('wallet/transactions/', { params })
  },
  redeemVoucher(code) {
    return api.post('wallet/voucher/redeem/', { code })
  },
}
