import { defineStore } from 'pinia'
import { getAttendanceFromDb, putAttendanceToDb, getMeta, setMeta, enqueueLeave, getLeaveQueue, dequeueLeave } from 'src/services/db'
import { fetchAttendance, createLeaveRequest, fetchMyLeaveRequests } from 'src/services/api'

function genIdempotencyKey() {
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export const useAttendanceStore = defineStore('attendance', {
  state: () => ({
    items: [],
    requests: [],
    queue: [],
    lastSyncedAt: null,
    loading: false,
    error: null,
    term: null,
  }),
  actions: {
    async loadFromDb(term) {
      this.loading = true
      this.error = null
      try {
        this.term = term || this.term
        const [records, lastSyncedAt, queue, mine] = await Promise.all([
          getAttendanceFromDb(this.term),
          getMeta(`attendance:lastSyncedAt:${this.term}`),
          getLeaveQueue(),
          fetchMyLeaveRequests().catch(() => ({ items: [] })),
        ])
        this.items = Array.isArray(records) ? records : []
        this.lastSyncedAt = lastSyncedAt
        this.queue = Array.isArray(queue) ? queue : []
        const list = Array.isArray(mine?.items) ? mine.items : mine
        this.requests = Array.isArray(list) ? list : []
      } catch (e) {
        this.error = e?.message || 'Failed to load attendance'
      } finally {
        this.loading = false
      }
    },

    async sync({ term, force = false } = {}) {
      this.loading = true
      this.error = null
      try {
        this.term = term || this.term
        const since = !force ? await getMeta(`attendance:lastSyncedAt:${this.term}`) : null
        const resp = await fetchAttendance({ term: this.term, since })
        const data = resp?.data || resp
        const incoming = Array.isArray(data.items) ? data.items : []
        // Merge by id updatedAt
        const map = new Map(this.items.map((r) => [r.id, r]))
        for (const r of incoming) {
          const cur = map.get(r.id)
          if (!cur || new Date(r.updatedAt) > new Date(cur.updatedAt)) map.set(r.id, { ...cur, ...r, term: this.term })
        }
        this.items = Array.from(map.values())
        await putAttendanceToDb(this.items)
        const stamp = new Date().toISOString()
        this.lastSyncedAt = stamp
        await setMeta(`attendance:lastSyncedAt:${this.term}`, stamp)
        // refresh my requests after sync
        const mine = await fetchMyLeaveRequests().catch(() => ({ items: [] }))
        this.requests = Array.isArray(mine?.items) ? mine.items : []
        return { ok: true }
      } catch (e) {
        this.error = e?.message || 'Attendance sync failed'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async submitLeave({ dateRange, reason, attachments } = {}) {
      const online = navigator.onLine
      const idempotencyKey = genIdempotencyKey()
      if (!online) {
        const q = await enqueueLeave({ id: idempotencyKey, dateRange, reason, attachments, createdAt: new Date().toISOString() })
        this.queue.push(q)
        return { queued: true }
      }
      try {
        const resp = await createLeaveRequest({ dateRange, reason, attachments, idempotencyKey })
        const item = resp?.data?.item || resp?.item || resp
        if (item) this.requests.unshift(item)
        return { ok: true, item }
      } catch (e) {
        return { ok: false, error: e?.message || 'Failed to submit leave request' }
      }
    },

    async flushQueue() {
      if (!navigator.onLine) return { ok: false, error: 'offline' }
      const queue = await getLeaveQueue()
      for (const q of queue) {
        try {
          const resp = await createLeaveRequest({ dateRange: q.dateRange, reason: q.reason, attachments: q.attachments, idempotencyKey: q.id })
          await dequeueLeave(q.id)
          const item = resp?.data?.item || resp?.item
          if (item) this.requests.unshift(item)
        } catch {
          // stop on first failure
          break
        }
      }
      this.queue = await getLeaveQueue()
      return { ok: true }
    },
  },
})

