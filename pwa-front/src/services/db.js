// Minimal IndexedDB wrapper for offline cache (no external deps)
const DB_NAME = 'school-poc'
const DB_VERSION = 2

// Ensure values are structured-cloneable before IndexedDB put
function toIdbSafe(input) {
  const seen = new WeakSet()
  function walk(value) {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') return undefined
      if (typeof value === 'bigint') return value.toString()
      return value
    }
    if (seen.has(value)) return undefined
    seen.add(value)
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return value.map(walk).filter((v) => v !== undefined)
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const sv = walk(v)
      if (sv !== undefined) out[k] = sv
    }
    return out
  }
  return walk(input)
}

function debugIfChanged(original, safe, store) {
  try {
    const a = JSON.stringify(original)
    const b = JSON.stringify(safe)
    if (a !== b) {
      console.warn(`[IDB:safe] adjusted object for store "${store}"`, {
        originalKeys: Object.keys(original || {}),
        types: Object.fromEntries(Object.entries(original || {}).map(([k, v]) => [k, typeof v])),
      })
    }
  } catch (e) {
    console.warn(`[IDB:safe] non-serializable original for store "${store}" — stored a sanitized copy`, e?.message)
  }
}

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('transcripts')) {
        const store = db.createObjectStore('transcripts', { keyPath: 'term' })
        store.createIndex('term', 'term', { unique: true })
      }
      // M2: schedule by term
      if (!db.objectStoreNames.contains('schedule')) {
        const store = db.createObjectStore('schedule', { keyPath: 'term' })
        store.createIndex('term', 'term', { unique: true })
      }
      // M2: events by id, indexed by date
      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }
      // M2: announcements by id, indexed by publishedAt
      if (!db.objectStoreNames.contains('announcements')) {
        const store = db.createObjectStore('announcements', { keyPath: 'id' })
        store.createIndex('publishedAt', 'publishedAt', { unique: false })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDB()
  const tx = db.transaction(storeName, mode)
  return tx.objectStore(storeName)
}

// Transcripts
export async function getTranscriptsFromDb(terms = []) {
  const store = await getStore('transcripts')
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  if (!terms || terms.length === 0) return all
  const set = new Set(terms)
  return all.filter((t) => set.has(t.term))
}

export async function putTranscriptsToDb(items = []) {
  if (!Array.isArray(items)) return
  const store = await getStore('transcripts', 'readwrite')
  await Promise.all(
    items.map(
      (item) =>
        new Promise((resolve, reject) => {
          const safe = toIdbSafe(item)
          debugIfChanged(item, safe, 'transcripts')
          const req = store.put(safe)
          req.onsuccess = () => resolve(true)
          req.onerror = () => {
            console.error('[IDB] put transcripts failed', req.error, { itemKeys: Object.keys(item || {}) })
            reject(req.error)
          }
        }),
    ),
  )
}

// Schedule
export async function getScheduleFromDb(term) {
  const store = await getStore('schedule')
  return await new Promise((resolve, reject) => {
    const req = store.get(term)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function putScheduleToDb(item) {
  if (!item || !item.term) return
  const store = await getStore('schedule', 'readwrite')
  return await new Promise((resolve, reject) => {
    const safe = toIdbSafe(item)
    debugIfChanged(item, safe, 'schedule')
    const req = store.put(safe)
    req.onsuccess = () => resolve(true)
    req.onerror = () => {
      console.error('[IDB] put schedule failed', req.error, { itemKeys: Object.keys(item || {}) })
      reject(req.error)
    }
  })
}

// Events
export async function getEventsFromDb({ start, end } = {}) {
  const store = await getStore('events')
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  if (!start && !end) return all
  const s = start ? new Date(start) : null
  const e = end ? new Date(end) : null
  return all.filter((ev) => {
    const d = new Date(ev.date)
    if (s && d < s) return false
    if (e && d > e) return false
    return true
  })
}

export async function putEventsToDb(items = []) {
  if (!Array.isArray(items)) return
  const store = await getStore('events', 'readwrite')
  await Promise.all(
    items.map(
      (item) =>
        new Promise((resolve, reject) => {
          const safe = toIdbSafe(item)
          debugIfChanged(item, safe, 'events')
          const req = store.put(safe)
          req.onsuccess = () => resolve(true)
          req.onerror = () => {
            console.error('[IDB] put events failed', req.error, { itemKeys: Object.keys(item || {}) })
            reject(req.error)
          }
        }),
    ),
  )
}

// Announcements
export async function getAnnouncementsFromDb() {
  const store = await getStore('announcements')
  return await new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))))
    req.onerror = () => reject(req.error)
  })
}

export async function upsertAnnouncementsToDb(items = []) {
  if (!Array.isArray(items)) return
  const store = await getStore('announcements', 'readwrite')
  await Promise.all(
    items.map(
      (item) =>
        new Promise((resolve, reject) => {
          const safe = toIdbSafe(item)
          debugIfChanged(item, safe, 'announcements')
          const req = store.put(safe)
          req.onsuccess = () => resolve(true)
          req.onerror = () => {
            console.error('[IDB] upsert announcements failed', req.error, { itemKeys: Object.keys(item || {}) })
            reject(req.error)
          }
        }),
    ),
  )
}

// Meta helpers
export async function getMeta(key) {
  const store = await getStore('meta')
  return await new Promise((resolve, reject) => {
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result?.value || null)
    req.onerror = () => reject(req.error)
  })
}

export async function setMeta(key, value) {
  const store = await getStore('meta', 'readwrite')
  return await new Promise((resolve, reject) => {
    const safe = toIdbSafe(value)
    debugIfChanged(value, safe, 'meta')
    const req = store.put({ key, value: safe })
    req.onsuccess = () => resolve(true)
    req.onerror = () => {
      console.error('[IDB] set meta failed', req.error, { key })
      reject(req.error)
    }
  })
}
