<script setup>
/**
 * TrainingModeSelector — §8.5
 * Renders active activities, emits 'select' when user picks one.
 */
import { computed } from 'vue'
import ActivityCard from './ActivityCard.vue'

const props = defineProps({
  activities: { type: Array, required: true },
  title:      { type: String, default: '' },
})

const emit = defineEmits(['select'])

const activeActivities = computed(() =>
  props.activities.filter(a => a.is_active)
)
</script>

<template>
  <div class="tms">
    <h3 v-if="title" class="tms__title">{{ title }}</h3>
    <div class="tms__list">
      <ActivityCard
        v-for="activity in activeActivities"
        :key="activity.id"
        :activity="activity"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.tms { display: flex; flex-direction: column; gap: var(--space-md); }
.tms__title { font-size: 0.82rem; color: rgba(255,255,255,0.45); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.tms__list { display: flex; flex-direction: column; gap: var(--space-sm); }
</style>
