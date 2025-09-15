const request = require('supertest')
const app = require('../app')

describe('GET /schedule since 過濾', () => {
  const term = '2024-1'

  test('不帶 since：應回傳 entries', async () => {
    const res = await request(app).get(`/schedule`).query({ term })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    const { entries } = res.body.data
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  test('帶非常早的 since（1970）：應回傳 entries 且其 updatedAt > since', async () => {
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

  test('帶未來的 since（公元 3000 年）：應回傳空 entries', async () => {
    const since = new Date('3000-01-01T00:00:00.000Z').toISOString()
    const res = await request(app).get(`/schedule`).query({ term, since })
    expect(res.status).toBe(200)
    const { entries } = res.body.data
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBe(0)
  })
})

