/**
 * Utility to append JWT token to media URLs for authenticated image access
 */
export function getAuthenticatedMediaUrl(mediaUrl: string | null | undefined): string {
  if (!mediaUrl) return '';

  const token = localStorage.getItem('token');
  if (!token) return mediaUrl;

  // If URL already has query params, append with &, otherwise use ?
  const separator = mediaUrl.includes('?') ? '&' : '?';
  return `${mediaUrl}${separator}token=${encodeURIComponent(token)}`;
}
