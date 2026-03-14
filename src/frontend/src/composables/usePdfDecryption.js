import * as pdfjsLib from 'pdfjs-dist'

/**
 * Load and decrypt a PDF from Supabase Storage (with fallback to backend).
 *
 * Flow:
 *   1. GET /decrypt-key/  → { key_b64, iv_b64, file_url }  (pre-signed URL)
 *   2. fetch file_url     → encrypted bytes  (fallback: GET /encrypted-file/)
 *   3. crypto.subtle.decrypt (AES-256-GCM) → plaintext ArrayBuffer
 *   4. pdfjsLib.getDocument({ data: new Uint8Array(buf) }) → PDFDocumentProxy
 */
export function usePdfDecryption() {

  async function loadEncryptedPdf(decryptKeyUrl, fallbackFileUrl, apiClient) {
    // 1. Fetch decrypt key + pre-signed file URL from backend (access check enforced server-side)
    const { data: keyData } = await apiClient.get(decryptKeyUrl)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      _b64ToBytes(keyData.key_b64),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )
    const iv = _b64ToBytes(keyData.iv_b64)

    // 2. Fetch encrypted file — pre-signed Supabase URL first, fallback to backend if unavailable
    let encryptedBuffer
    try {
      const response = await fetch(keyData.file_url)
      if (!response.ok) throw new Error(`Supabase responded ${response.status}`)
      encryptedBuffer = await response.arrayBuffer()
    } catch {
      const fallback = await apiClient.get(fallbackFileUrl, { responseType: 'arraybuffer' })
      encryptedBuffer = fallback.data
    }

    // 3. AES-256-GCM decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedBuffer,
    )

    // 4. PDF.js requires a TypedArray (Uint8Array), not a raw ArrayBuffer
    return await pdfjsLib.getDocument({ data: new Uint8Array(decryptedBuffer) }).promise
  }

  /**
   * Decode base64 string to Uint8Array.
   * Returns Uint8Array (not .buffer) for compatibility with Web Crypto API on Safari < 15.
   */
  function _b64ToBytes(b64) {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }

  return { loadEncryptedPdf }
}
