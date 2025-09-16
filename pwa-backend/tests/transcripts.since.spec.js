const request = require('supertest')
const app = require('../app')

describe('GET /me/transcripts since filter', () => {
  const terms = '2025-1,2025-2'

  test('Without since: returns at least one term with courses', async () => {
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

  test('With very early since (1970): returns data with each course updatedAt > since', async () => {
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

  test('With future since (year 3000): returns empty items', async () => {
    const since = new Date('3000-01-01T00:00:00.000Z').toISOString()
    const res = await request(app).get(`/me/transcripts`).query({ terms, since })
    expect(res.status).toBe(200)
    const { items } = res.body.data
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBe(0)
  })
})
