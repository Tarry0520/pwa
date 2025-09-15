// API helpers for Transcript (M1)
// Uses axios api instance with environment-based baseURL configuration
import { api } from 'src/boot/axios'

// Build query string
function qs(params) {
  const u = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return
    if (Array.isArray(v)) u.set(k, v.join(','))
    else u.set(k, String(v))
  })
  return u.toString()
}

export async function fetchTranscripts({ terms = [], since } = {}) {
  const query = qs({ terms, since })
  const path = `/me/transcripts${query ? `?${query}` : ''}`

  // Use axios instance with environment-based configuration
  const resp = await api.get(path)
  return resp.data || resp
}
