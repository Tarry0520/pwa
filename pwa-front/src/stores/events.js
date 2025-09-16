import { defineStore } from 'pinia'
import { getEventsFromDb, putEventsToDb, getMeta, setMeta } from 'src/services/db'
import { fetchEvents } from 'src/services/api'

export const useEventsStore = defineStore('events', {
  state: () => ({
    items: [],
    lastSyncedAt: null,
    loading: false,
    error: null,
    range: null, // { start, end }
  }),
  getters: {
    byDate(state) {
      const map = {}
      for (const ev of state.items) {
        const d = (ev.date || '').slice(0, 10)
        if (!map[d]) map[d] = []
        map[d].push(ev)
      }
      return map
    },
  },
  actions: {
    async loadFromDb(range) {
      this.loading = true
      this.error = null
      try {
        this.range = range || this.range
        const [records, lastSyncedAt] = await Promise.all([
          getEventsFromDb(range || {}),
          getMeta('events:lastSyncedAt'),
        ])
        this.items = records
        this.lastSyncedAt = lastSyncedAt
      } catch (e) {
        this.error = e?.message || '載入行事曆失敗'
      } finally {
        this.loading = false
      }
    },

    async sync({ range, term = 'current', force = false } = {}) {
      this.loading = true
      this.error = null
      try {
        const since = !force ? await getMeta('events:lastSyncedAt') : null
        const resp = await fetchEvents({ range: range && `${range.start}..${range.end}`, term, since })
        const data = resp?.data || resp
        const incoming = Array.isArray(data.items) ? data.items : []

        // Merge by id and updatedAt
        const map = new Map(this.items.map((e) => [e.id, e]))
        for (const e of incoming) {
          const cur = map.get(e.id)
          if (!cur || new Date(e.updatedAt) > new Date(cur.updatedAt)) map.set(e.id, e)
        }
        const merged = Array.from(map.values())
        this.items = merged
        await putEventsToDb(incoming)

        this.lastSyncedAt = new Date().toISOString()
        await setMeta('events:lastSyncedAt', this.lastSyncedAt)
        return { ok: true }
      } catch (e) {
        this.error = e?.message || '行事曆同步失敗'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },
  },
})

