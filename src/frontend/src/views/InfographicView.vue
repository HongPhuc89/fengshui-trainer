<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { videosService } from '../services/videos.service'

const route  = useRoute()
const router = useRouter()

const pdfUrl   = ref(null)
const loading  = ref(true)
const error    = ref(null)

onMounted(async () => {
  try {
    const res = await videosService.getInfographicPdfUrlBySlug(route.params.lessonSlug)
    pdfUrl.value = res.data.url
  } catch (e) {
    error.value = e?.response?.status === 404
      ? 'Bài học này chưa có lược đồ PDF.'
      : 'Không thể tải lược đồ. Vui lòng thử lại.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="ig">

    <!-- Header -->
    <header class="ig__header">
      <button class="ig__back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="22" height="22">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <span class="ig__title">Lược đồ</span>
      <a v-if="pdfUrl" :href="pdfUrl" target="_blank" rel="noopener" class="ig__open-btn">
        Mở ↗
      </a>
      <div v-else style="width:52px"></div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="ig__state">
      <div class="ig__spinner"></div>
      <span>Đang tải lược đồ...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="ig__state ig__state--error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" opacity=".4">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="ig__btn-back" @click="router.back()">Quay lại</button>
    </div>

    <!-- PDF iframe -->
    <iframe
      v-else-if="pdfUrl"
      :src="pdfUrl + '#toolbar=0'"
      class="ig__frame"
      title="Lược đồ bài học"
      allowfullscreen
    />

  </div>
</template>

<style scoped>
.ig {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: var(--bg-main);
}

/* Header */
.ig__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-md);
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.ig__back-btn {
  background: none;
  color: var(--accent-gold);
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.ig__back-btn:hover { background: rgba(255,255,255,0.06); }

.ig__title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.ig__open-btn {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--accent-gold);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}
.ig__open-btn:hover { background: rgba(197,165,81,0.1); }

/* States */
.ig__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  color: rgba(255,255,255,0.5);
  font-size: 0.9rem;
  padding: var(--space-xl);
}
.ig__state--error { color: rgba(255,255,255,0.45); }

.ig__spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255,255,255,0.12);
  border-top-color: var(--accent-gold);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.ig__btn-back {
  background: var(--btn-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9rem;
}

/* PDF frame — fills remaining viewport below header */
.ig__frame {
  flex: 1;
  width: 100%;
  height: calc(100dvh - 56px);
  border: none;
  display: block;
}
</style>
