<script setup>
defineProps({ size: { type: [Number, String], default: 14 } })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    :width="size"
    :height="size"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12"/>
  </svg>
</template>
