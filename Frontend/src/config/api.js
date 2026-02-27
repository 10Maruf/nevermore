// API Configuration
// Default: same-origin "/backend" (matches cPanel deployment layout)
// Local dev: set VITE_API_BASE_URL=http://127.0.0.1:8000 in .env
// Override anytime via Vite env: VITE_API_BASE_URL

const envBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? String(import.meta.env.VITE_API_BASE_URL).trim()
  : ''

const defaultBaseUrl = (typeof window !== 'undefined')
  ? `${window.location.origin}/backend`
  : 'https://nevermorebrand.com/backend'

export const API_BASE_URL = envBaseUrl || defaultBaseUrl

// Helper function to build API endpoints
export const getApiUrl = (endpoint) => `${API_BASE_URL}${endpoint}`

// Resolve backend-provided asset paths (e.g. "/uploads/..." or full URLs)
// into an absolute URL that works in both local dev and production.
export const resolveBackendUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  // Normalize slashes and trim
  let normalizedPath = String(path).trim().replace(/\\/g, '/')

  // Legacy rows store only the filename (e.g. "upload_123.webp")
  if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`

  // Fix legacy paths that miss the "/uploads" segment
  if (/^\/backend\/upload_/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/backend\/upload_/i, '/uploads/upload_')
  } else if (/^\/upload_/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/upload_/i, '/uploads/upload_')
  }

  // Strip legacy /backend prefix if present (Laravel serves from root)
  if (/^\/backend\//i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^\/backend/i, '')
  }

  // Build absolute URL using API base origin
  const origin = API_BASE_URL.replace(/\/+$/, '').replace(/\/api.*$/i, '')
  return `${origin}${normalizedPath}`
}
