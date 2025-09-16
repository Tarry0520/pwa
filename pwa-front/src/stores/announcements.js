import { defineStore } from 'pinia'
import { getAnnouncementsFromDb, upsertAnnouncementsToDb, getMeta, setMeta } from 'src/services/db'
import { fetchAnnouncements, markAnnouncementRead } from 'src/services/api'

export const useAnnouncementsStore = defineStore('announcements', {
  state: () => ({
    items: [],
    lastSyncedAt: null,
    loading: false,
    error: null,
  }),
  actions: {
    async loadFromDb() {
      this.loading = true
      this.error = null
      try {
        const [records, lastSyncedAt] = await Promise.all([
          getAnnouncementsFromDb(),
          getMeta('announcements:lastSyncedAt'),
        ])
        this.items = records
        this.lastSyncedAt = lastSyncedAt
      } catch (e) {
        this.error = e?.message || '載入公告失敗'
      } finally {
        this.loading = false
      }
    },

    async sync({ force = false } = {}) {
      this.loading = true
      this.error = null
      try {
        const since = !force ? await getMeta('announcements:lastSyncedAt') : null
        const resp = await fetchAnnouncements({ since })
        const data = resp?.data || resp
        const incoming = Array.isArray(data.items) ? data.items : []
        // Merge by id with updatedAt
        const map = new Map(this.items.map((a) => [a.id, a]))
        for (const a of incoming) {
          const cur = map.get(a.id)
          if (!cur || new Date(a.updatedAt) > new Date(cur.updatedAt)) map.set(a.id, { ...cur, ...a })
        }
        this.items = Array.from(map.values()).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
        await upsertAnnouncementsToDb(incoming)

        this.lastSyncedAt = new Date().toISOString()
        await setMeta('announcements:lastSyncedAt', this.lastSyncedAt)
        return { ok: true }
      } catch (e) {
        this.error = e?.message || '公告同步失敗'
        return { ok: false, error: this.error }
      } finally {
        this.loading = false
      }
    },

    async markRead(id) {
      try {
        const resp = await markAnnouncementRead(id)
        const readAt = resp?.data?.readAt || new Date().toISOString()
        const idx = this.items.findIndex((x) => x.id === id)
        if (idx >= 0) {
          this.items[idx] = { ...this.items[idx], read: true, readAt }
          await upsertAnnouncementsToDb([this.items[idx]])
        }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e?.message || '標記已讀失敗' }
      }
    },
  },
})

