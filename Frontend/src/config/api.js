// API Configuration
// Default: same-origin "/backend" (matches cPanel deployment layout)
// Local dev: Vite proxies "/backend" to the cPanel backend via vite.config.js
// Override anytime via Vite env: VITE_API_BASE_URL

const envBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? String(import.meta.env.VITE_API_BASE_URL).trim()
  : ''

const defaultBaseUrl = (typeof window !== 'undefined')
  ? `${window.location.origin}/backend`
  : 'https://evermorebrand.com/backend'

export const API_BASE_URL = envBaseUrl || defaultBaseUrl

// Helper function to build API endpoints
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`

// Resolve backend-provided asset paths (e.g. "/backend/uploads/..." or "/uploads/...")
// into an absolute URL that works in both local dev and production.
export const resolveBackendUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  // Normalize slashes and trim
  let normalizedPath = String(path).trim().replace(/\\/g, '/')

  // Some legacy rows store only the filename (e.g. "upload_123.webp")
  if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`

  // Fix legacy paths that miss the "/uploads" segment
  // Examples seen in older data: "/backend/upload_123.webp" or "/upload_123.webp"
  if (/^\/backend\/upload_/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/backend\/upload_/i, '/backend/uploads/upload_')
  } else if (/^\/upload_/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/upload_/i, '/backend/uploads/upload_')
  }

  // If API is mounted under "/backend", prefer keeping assets under "/backend" too.
  // This makes Vite proxying work in local dev and matches typical cPanel layout.
  if (/\/backend\/?$/i.test(API_BASE_URL) && /^\/uploads\//i.test(normalizedPath)) {
    normalizedPath = `/backend${normalizedPath}`
  }

  const origin = API_BASE_URL.replace(/\/backend\/?$/i, '')
  return `${origin}${normalizedPath}`
}
