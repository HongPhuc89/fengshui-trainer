<script setup>
defineProps({
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  error: { type: String, default: '' },
  icon: { type: String, default: 'person' },
  showPasswordToggle: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
const visible = defineModel('visible', { type: Boolean, default: false })
</script>

<template>
  <div class="form-input">
    <label v-if="label" class="form-input__label">{{ label }}</label>
    <div class="form-input__wrap">
      <span class="form-input__icon form-input__icon--left" aria-hidden="true">
        <svg v-if="icon === 'person'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <svg v-else-if="icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <svg v-else-if="icon === 'envelope'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <svg v-else-if="icon === 'lock' || icon === 'shield'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </span>
      <input
        :type="showPasswordToggle ? (visible ? 'text' : 'password') : type"
        :placeholder="placeholder"
        :value="modelValue"
        class="form-input__field"
        :class="{ 'form-input__field--error': error }"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        v-if="showPasswordToggle"
        type="button"
        class="form-input__icon form-input__icon--right"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <svg v-if="visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
    </div>
    <p v-if="error" class="form-input__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.form-input { margin-bottom: var(--space-md); }
.form-input__label { display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: var(--space-sm); }
.form-input__wrap { position: relative; display: flex; align-items: center; }
.form-input__icon { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: none; padding: 0; }
.form-input__icon--left { left: 12px; }
.form-input__icon--right { right: 12px; }
.form-input__field { width: 100%; padding: 12px 12px 12px 44px; border-radius: var(--radius-md); border: 1px solid var(--border-input); background: var(--bg-input); color: var(--text-primary); font-size: 1rem; }
.form-input__field:focus { outline: none; border-color: var(--accent-gold); }
.form-input__field--error { border-color: #e57373; }
.form-input__field::placeholder { color: var(--text-muted); }
.form-input__wrap:has(.form-input__icon--right) .form-input__field { padding-right: 44px; }
.form-input__error { font-size: 0.8rem; color: #e57373; margin-top: var(--space-xs); }
</style>
