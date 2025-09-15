const request = require('supertest')
const app = require('../app')

describe('GET /me/transcripts since 過濾', () => {
  const terms = '2024-1,2024-2'

  test('不帶 since：應回傳至少一個學期與課程', async () => {
    const res = await request(app).get(`/me/transcripts`).query({ terms })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data')
    const { items } = res.body.data
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toHaveProperty('courses')
    expect(Array.isArray(items[0].courses)).toBe(true)
  })

  test('帶非常早的 since（1970）：應回傳有資料，且每筆課程 updatedAt > since', async () => {
    const since = new Date(0).toISOString()
    const res = await request(app).get(`/me/transcripts`).query({ terms, since })
    expect(res.status).toBe(200)
    const { items } = res.body.data
    expect(items.length).toBeGreaterThan(0)
    const sinceTs = new Date(since).getTime()
    for (const term of items) {
      for (const c of term.courses) {
        expect(new Date(c.updatedAt).getTime()).toBeGreaterThan(sinceTs)
      }
    }
  })

  test('帶未來的 since（公元 3000 年）：應回傳空 items', async () => {
    const since = new Date('3000-01-01T00:00:00.000Z').toISOString()
    const res = await request(app).get(`/me/transcripts`).query({ terms, since })
    expect(res.status).toBe(200)
    const { items } = res.body.data
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBe(0)
  })
})

