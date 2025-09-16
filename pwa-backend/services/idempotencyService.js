const { get, setWithExpiry } = require('../config/redis')

const DEFAULT_TTL = 24 * 60 * 60 // 24h

function keyOf(idemKey) {
  return `idem:${idemKey}`
}

async function getStored(idemKey) {
  if (!idemKey) return null
  try {
    return await get(keyOf(idemKey))
  } catch (e) {
    return null
  }
}

async function store(idemKey, payload, statusCode = 200, ttlSeconds = DEFAULT_TTL) {
  if (!idemKey) return false
  const value = { statusCode, payload }
  try {
    await setWithExpiry(keyOf(idemKey), value, ttlSeconds)
    return true
  } catch (e) {
    return false
  }
}

module.exports = { getStored, store }

