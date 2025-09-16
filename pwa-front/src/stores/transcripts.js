import { defineStore } from 'pinia'
import { getTranscriptsFromDb, putTranscriptsToDb, getMeta, setMeta } from 'src/services/db'
import { fetchTranscripts } from 'src/services/api'

export const useTranscriptsStore = defineStore('transcripts', {
  state: () => ({
    itemsByTerm: {}, // { [term]: { term, courses: [...], gpa, updatedAt } }
    lastSyncedAt: null,
    loading: false,
    error: null,
  }),
  getters: {
    terms(state) {
      return Object.keys(state.itemsByTerm).sort().reverse()
    },
  },
  actions: {
    async loadFromDb(terms = []) {
      this.loading = true
      this.error = null
      try {
        const [records, lastSyncedAt] = await Promise.all([
          getTranscriptsFromDb(terms),
          getMeta('transcripts:lastSyncedAt'),
        ])
        const map = {}
        records.forEach((r) => {
          map[r.term] = r
        })
        this.itemsByTerm = map
        this.lastSyncedAt = lastSyncedAt
      } catch (e) {
        this.error = e?.message || 'Failed to load offline data'
      } finally {
        this.loading = false
      }
    },

    async sync({ terms = [], force = false } = {}) {
      // If not forced and recent sync within 7 days, skip network
      const now = Date.now()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (!force && this.lastSyncedAt && now - new Date(this.lastSyncedAt).getTime() < sevenDays) {
        return { skipped: true }
      }

      this.loading = true
      this.error = null
      try {
        const since = this.lastSyncedAt || undefined
        const data = await fetchTranscripts({ terms, since })
        const list = Array.isArray(data?.items) ? data.items : data
        if (Array.isArray(list)) {
          // merge by term, updatedAt wins
          list.forEach((item) => {
            const current = this.itemsByTerm[item.term]
            if (!current || new Date(item.updatedAt) > new Date(current.updatedAt)) {
              this.itemsByTerm[item.term] = item
            }
          })
          // De-proxy before saving to IndexedDB to avoid structured clone errors
          const toSave = Object.values(this.itemsByTerm).map((it) => JSON.parse(JSON.stringify(it)))
          await putTranscriptsToDb(toSave)
        }
        this.lastSyncedAt = new Date().toISOString()
        await setMeta('transcripts:lastSyncedAt', this.lastSyncedAt)
        return { ok: true }
      } catch (e) {
        this.error = e?.message || 'Sync failed'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    exportPdf() {
      // Basic print as PDF using browser dialog
      window.print()
    },
  },
})
