/**
 * Format time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate quiz progress percentage
 */
export function calculateProgress(currentIndex: number, total: number): number {
  return ((currentIndex + 1) / total) * 100;
}
