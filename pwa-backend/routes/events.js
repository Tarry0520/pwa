const express = require('express')
const router = express.Router()
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')

function sampleEvents() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const toIso = (d) => new Date(d).toISOString()

  const e1Date = new Date(today)
  const e2Date = new Date(today); e2Date.setDate(e2Date.getDate() + 3)
  const e3Date = new Date(today); e3Date.setDate(e3Date.getDate() + 15)

  const nowIso = new Date().toISOString()
  return [
    { id: 'ev-2001', type: 'school', date: toIso(e1Date), title: '開學典禮', location: '大禮堂', updatedAt: nowIso },
    { id: 'ev-2002', type: 'exam', date: toIso(e2Date), title: '數學小考', courseId: '2024-1-MATH101', location: 'A101', updatedAt: nowIso },
    { id: 'ev-2003', type: 'activity', date: toIso(e3Date), title: '運動會預賽', location: '操場', updatedAt: nowIso },
  ]
}

function parseRange(range) {
  if (!range) return null
  const m = String(range).split('..')
  if (m.length !== 2) return null
  const start = new Date(m[0])
  const end = new Date(m[1])
  if (isNaN(start) || isNaN(end)) return null
  return { start, end }
}

// GET /events?range=YYYY-MM-DD..YYYY-MM-DD or ?term=current [&since=iso]
router.get('/events', async (req, res) => {
  const { range, term, since } = req.query
  const sinceDate = since ? new Date(since) : null
  let items = sampleEvents()

  if (term === 'current' && !range) {
    // For POC, current month range
    const now = new Date()
    const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59))
    items = items.filter((e) => {
      const d = new Date(e.date)
      return d >= start && d <= end
    })
  }

  const r = parseRange(range)
  if (r) {
    items = items.filter((e) => {
      const d = new Date(e.date)
      return d >= r.start && d <= r.end
    })
  }

  if (sinceDate && !isNaN(sinceDate.getTime())) {
    items = items.filter((e) => new Date(e.updatedAt).getTime() > sinceDate.getTime())
  }

  return successResponse(res, 200, 'Events fetched', { items, since: since || null })
})

module.exports = router

