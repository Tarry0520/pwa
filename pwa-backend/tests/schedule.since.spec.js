const request = require('supertest')
const app = require('../app')

describe('GET /schedule since filter', () => {
  const term = '2025-1'

  test('Without since: returns entries', async () => {
    const res = await request(app).get(`/schedule`).query({ term })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    const { entries } = res.body.data
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  test('With very early since (1970): returns entries with updatedAt > since', async () => {
    const since = new Date(0).toISOString()
    const res = await request(app).get(`/schedule`).query({ term, since })
    expect(res.status).toBe(200)
    const { entries } = res.body.data
    expect(entries.length).toBeGreaterThan(0)
    const sinceTs = new Date(since).getTime()
    for (const e of entries) {
      expect(new Date(e.updatedAt).getTime()).toBeGreaterThan(sinceTs)
    }
  })

  test('With future since (year 3000): returns empty entries', async () => {
    const since = new Date('3000-01-01T00:00:00.000Z').toISOString()
    const res = await request(app).get(`/schedule`).query({ term, since })
    expect(res.status).toBe(200)
    const { entries } = res.body.data
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBe(0)
  })
})
