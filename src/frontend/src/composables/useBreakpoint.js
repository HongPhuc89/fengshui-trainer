import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Composable to detect viewport breakpoints reactively.
 * Manages its own resize listener — safe to use in multiple components simultaneously.
 *
 * Breakpoints (consistent with Tailwind defaults):
 *   sm  >= 640px
 *   md  >= 768px
 *   lg  >= 1024px
 *   xl  >= 1280px
 */
export function useBreakpoint() {
  const windowWidth = ref(window.innerWidth)

  function onResize() {
    windowWidth.value = window.innerWidth
  }

  onMounted(() => window.addEventListener('resize', onResize))
  onBeforeUnmount(() => window.removeEventListener('resize', onResize))

  return {
    windowWidth,
    isSm:  computed(() => windowWidth.value >= 640),
    isMd:  computed(() => windowWidth.value >= 768),
    isLg:  computed(() => windowWidth.value >= 1024),
    isXl:  computed(() => windowWidth.value >= 1280),
  }
}
