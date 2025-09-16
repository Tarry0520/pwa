const { get, setWithExpiry } = require('../config/redis')

// Simple read-receipt service with Redis + in-memory fallback
// Keys are scoped by user to support deduplication.

const FALLBACK_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days for POC
const memoryStore = new Map()

function buildKey(announcementId, { userId }) {
  if (!userId) throw new Error('userId is required for read receipt')
  const scope = `u:${userId}`
  return `ann:read:${scope}:${announcementId}`
}

async function markAsRead({ announcementId, userId, ttlSeconds = FALLBACK_TTL_SECONDS }) {
  const key = buildKey(announcementId, { userId })

  // Try Redis first
  try {
    const existing = await get(key)
    if (existing && existing.readAt) {
      return { duplicated: true, readAt: existing.readAt }
    }

    const readAt = new Date().toISOString()
    await setWithExpiry(key, { id: announcementId, readAt }, ttlSeconds)
    return { duplicated: false, readAt }
  } catch (e) {
    // Fallback to in-memory store on error
    const now = new Date().toISOString()
    if (memoryStore.has(key)) {
      const v = memoryStore.get(key)
      return { duplicated: true, readAt: v.readAt }
    }
    memoryStore.set(key, { id: announcementId, readAt: now })
    // Schedule expiration
    setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000).unref?.()
    return { duplicated: false, readAt: now }
  }
}

module.exports = {
  markAsRead,
}
