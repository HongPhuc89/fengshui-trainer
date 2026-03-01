<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  tabs: { type: Array, required: true },  // [{ label }]
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <nav class="tab-nav">
    <button
      v-for="(tab, i) in tabs"
      :key="i"
      class="tab-nav__btn"
      :class="{ 'tab-nav__btn--active': modelValue === i }"
      @click="emit('update:modelValue', i)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.tab-nav {
  display: flex;
  position: sticky;
  top: 56px;
  z-index: 9;
  background: var(--bg-main);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.tab-nav__btn {
  flex: 1;
  height: 48px;
  background: none;
  color: rgba(255,255,255,0.5);
  font-size: 0.82rem;
  font-weight: 600;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tab-nav__btn--active {
  color: var(--accent-gold);
  border-bottom-color: var(--accent-gold);
}

.tab-nav__btn:hover:not(.tab-nav__btn--active) {
  color: rgba(255,255,255,0.75);
}
</style>
