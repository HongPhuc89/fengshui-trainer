<script setup>
defineProps({
  pdfUrl: { type: String, default: null },
})
</script>

<template>
  <div class="infographic">
    <!-- PDF panel -->
    <div v-if="pdfUrl" class="infographic__pdf">
      <a :href="pdfUrl" target="_blank" rel="noopener" class="infographic__download-btn">
        Mở lược đồ PDF ↗
      </a>
      <iframe
        :src="pdfUrl + '#toolbar=0'"
        class="infographic__pdf-frame"
        title="Lược đồ bài học"
      />
    </div>

    <!-- Empty state -->
    <div v-else class="infographic__empty">
      Bài học này chưa có lược đồ.
    </div>
  </div>
</template>

<style scoped>
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

.infographic__empty {
  padding: 24px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  text-align: center;
}
</style>
