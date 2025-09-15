// Minimal IndexedDB wrapper for offline cache (no external deps)
const DB_NAME = 'school-poc'
const DB_VERSION = 1

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
          const req = store.put(item)
          req.onsuccess = () => resolve(true)
          req.onerror = () => reject(req.error)
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
    const req = store.put({ key, value })
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}
