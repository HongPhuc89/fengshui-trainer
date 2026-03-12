<script setup>
defineProps({
  size: { type: [Number, String], default: 16 },
  color: { type: String, default: '#29b6f6' },
})
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :fill="color"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <path d="M6 2L2 8l10 14L22 8l-4-6H6zm1.5 2h9l2.5 4H5L6.5 4zM5.5 10h13l-8.5 12L5.5 10z"/>
  </svg>
</template>
