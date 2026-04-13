<script setup>
import { ref } from 'vue'

const props = defineProps({
  pdfUrl: { type: String, default: null },
  videoUrl: { type: String, default: null },
})

// Default to PDF view if available, otherwise video.
const activeView = ref(props.pdfUrl ? 'pdf' : 'video')
</script>

<template>
  <div class="infographic">
    <!-- Toggle bar — only shown when both types are available -->
    <div v-if="pdfUrl && videoUrl" class="infographic__toggle">
      <button
        :class="['infographic__toggle-btn', { active: activeView === 'pdf' }]"
        @click="activeView = 'pdf'"
      >
        Lược đồ PDF
      </button>
      <button
        :class="['infographic__toggle-btn', { active: activeView === 'video' }]"
        @click="activeView = 'video'"
      >
        Video tóm tắt
      </button>
    </div>

    <!-- PDF panel -->
    <div v-if="pdfUrl && (activeView === 'pdf' || !videoUrl)" class="infographic__pdf">
      <a :href="pdfUrl" target="_blank" rel="noopener" class="infographic__download-btn">
        Mở lược đồ PDF ↗
      </a>
      <iframe
        :src="pdfUrl + '#toolbar=0'"
        class="infographic__pdf-frame"
        title="Lược đồ bài học"
      />
    </div>

    <!-- Summary video panel -->
    <div v-if="videoUrl && (activeView === 'video' || !pdfUrl)" class="infographic__video">
      <iframe
        :src="videoUrl"
        class="infographic__video-frame"
        allowfullscreen
        title="Video tóm tắt bài học"
      />
    </div>
  </div>
</template>

<style scoped>
.infographic__toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.infographic__toggle-btn {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
}

.infographic__toggle-btn.active {
  background: #1976d2;
  color: #fff;
  border-color: #1976d2;
}

.infographic__download-btn {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 13px;
}

.infographic__pdf-frame {
  width: 100%;
  height: 600px;
  border: none;
}

.infographic__video-frame {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: none;
}
</style>
