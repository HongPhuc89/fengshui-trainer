<script setup>
defineProps({ size: { type: [Number, String], default: 20 } })
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    :width="size"
    :height="size"
    opacity=".4"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
</template>
