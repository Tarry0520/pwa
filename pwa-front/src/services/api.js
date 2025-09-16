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

// Schedule
export async function fetchSchedule({ term, since } = {}) {
  const query = qs({ term, since })
  const path = `/schedule${query ? `?${query}` : ''}`
  const resp = await api.get(path)
  return resp.data || resp
}

// Events
export async function fetchEvents({ range, term, since } = {}) {
  const query = qs({ range, term, since })
  const path = `/events${query ? `?${query}` : ''}`
  const resp = await api.get(path)
  return resp.data || resp
}

// Announcements
export async function fetchAnnouncements({ since } = {}) {
  const query = qs({ since })
  const path = `/announcements${query ? `?${query}` : ''}`
  const resp = await api.get(path)
  return resp.data || resp
}

export async function markAnnouncementRead(id) {
  const resp = await api.post(`/announcements/${encodeURIComponent(id)}/read`)
  return resp.data || resp
}

// Attendance
export async function fetchAttendance({ term } = {}) {
  const query = qs({ term })
  const path = `/attendance${query ? `?${query}` : ''}`
  const resp = await api.get(path)
  return resp.data || resp
}

// Leave Requests
export async function fetchMyLeaveRequests() {
  const path = `/leave-requests?mine=true`
  const resp = await api.get(path)
  return resp.data || resp
}

export async function createLeaveRequest({ dateRange, reason, attachments, idempotencyKey } = {}) {
  const headers = {}
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const resp = await api.post(`/leave-requests`, { dateRange, reason, attachments }, { headers })
  return resp.data || resp
}
