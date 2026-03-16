<script setup>
defineProps({ size: { type: [Number, String], default: 16 } })
</script>

<template>
  <svg viewBox="0 0 24 24" fill="currentColor" :width="size" :height="size" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
</template>
