import { defineStore } from 'pinia'
import { getScheduleFromDb, setMeta, getMeta, putScheduleToDb } from 'src/services/db'
import { fetchSchedule } from 'src/services/api'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    byTerm: {},
    lastSyncedAt: null,
    loading: false,
    error: null,
  }),
  actions: {
    async loadFromDb(term) {
      this.loading = true
      this.error = null
      try {
        const [record, lastSyncedAt] = await Promise.all([
          term ? getScheduleFromDb(term) : Promise.resolve(null),
          getMeta('schedule:lastSyncedAt'),
        ])
        if (record) this.byTerm[record.term] = record
        this.lastSyncedAt = lastSyncedAt
      } catch (e) {
        this.error = e?.message || 'Failed to load schedule'
      } finally {
        this.loading = false
      }
    },

    async sync({ term, force = false } = {}) {
      if (!term) {
        this.error = 'term is required (e.g. 2025-1)'
        return { ok: false, error: this.error }
      }
      this.loading = true
      this.error = null
      try {
        const since = !force ? await getMeta(`schedule:lastSyncedAt:${term}`) : null
        const resp = await fetchSchedule({ term, since })
        const data = resp?.data || resp
        const payload = data
        // Merge entries by updatedAt
        const existing = this.byTerm[term]?.entries || []
        let merged
        if (since && Array.isArray(payload.entries) && payload.entries.length === 0) {
          merged = existing
        } else if (existing.length > 0 && Array.isArray(payload.entries)) {
          const keyOf = (e) => `${e.weekday}-${e.period}-${e.courseId}`
          const map = new Map(existing.map((e) => [keyOf(e), e]))
          payload.entries.forEach((e) => {
            const k = keyOf(e)
            const cur = map.get(k)
            if (!cur || new Date(e.updatedAt) > new Date(cur.updatedAt)) {
              map.set(k, e)
            }
          })
          merged = Array.from(map.values())
        } else {
          merged = payload.entries || []
        }

        const record = { term, updatedAt: payload.updatedAt || new Date().toISOString(), entries: merged }
        this.byTerm[term] = record
        await putScheduleToDb(record)
        const stamp = new Date().toISOString()
        this.lastSyncedAt = stamp
        await setMeta('schedule:lastSyncedAt', stamp)
        await setMeta(`schedule:lastSyncedAt:${term}`, stamp)
        return { ok: true }
      } catch (e) {
        this.error = e?.message || 'Schedule sync failed'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
  },
})

