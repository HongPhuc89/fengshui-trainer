<script setup>
defineProps({
  canReset: { type: Boolean, default: false },
  lastResetDate: { type: String, default: '' },
})
defineEmits(['confirm', 'close'])
</script>

<template>
  <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="device-lock-title" @click.self="$emit('close')">
    <div class="modal">
      <h2 id="device-lock-title" class="modal__title">Thiết bị khác</h2>
      <p class="modal__text">
        Thiết bị này khác với thiết bị đã đăng ký. Bạn có muốn đổi sang thiết bị này? (Tiếp theo bạn sẽ phải đợi 1 năm mới có thể đổi lại.)
      </p>
      <div class="modal__actions">
        <button type="button" class="modal__btn modal__btn--secondary" @click="$emit('close')">Hủy</button>
        <button type="button" class="modal__btn modal__btn--primary" :disabled="!canReset" @click="$emit('confirm')">
          Đổi thiết bị
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}
.modal {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  max-width: 360px;
  width: 100%;
}
.modal__title { font-size: 1.25rem; margin-bottom: var(--space-md); color: var(--text-primary); }
.modal__text { font-size: 0.95rem; color: var(--text-secondary); margin-bottom: var(--space-lg); line-height: 1.5; }
.modal__actions { display: flex; gap: var(--space-md); justify-content: flex-end; }
.modal__btn { padding: 10px 20px; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; }
.modal__btn--secondary { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-input); }
.modal__btn--primary { background: var(--btn-primary); color: var(--text-primary); }
.modal__btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
