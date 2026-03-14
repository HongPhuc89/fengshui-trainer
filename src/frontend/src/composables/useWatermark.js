import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

export function useWatermark() {
  const auth = useAuthStore()

  const watermarkText = computed(() => auth.user?.email ?? '')

  const watermarkBgImage = computed(() => {
    if (!watermarkText.value) return 'none'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="120">
      <text x="140" y="70" fill="rgba(0,0,0,0.6)" font-size="13" text-anchor="middle"
        transform="rotate(-30,140,70)" font-family="sans-serif" font-weight="600">${watermarkText.value}</text>
    </svg>`
    return `url("data:image/svg+xml;charset=utf8,${encodeURIComponent(svg)}")`
  })

  return { watermarkText, watermarkBgImage }
}
