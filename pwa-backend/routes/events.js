const express = require('express')
const router = express.Router()
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')

function sampleEvents() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const toIso = (d) => new Date(d).toISOString()
  const month = now.getMonth()
  const termNo = (month >= 8 || month <= 1) ? 1 : 2
  const year = now.getFullYear()

  const e1Date = new Date(today)
  const e2Date = new Date(today); e2Date.setDate(e2Date.getDate() + 3)
  const e3Date = new Date(today); e3Date.setDate(e3Date.getDate() + 15)

  const nowIso = new Date().toISOString()
  return [
    { id: 'ev-2001', type: 'school', date: toIso(e1Date), title: 'Opening Ceremony', location: 'Main Auditorium', updatedAt: nowIso },
    { id: 'ev-2002', type: 'exam', date: toIso(e2Date), title: 'Math Quiz', courseId: `${year}-${termNo}-MATH101`, location: 'A101', updatedAt: nowIso },
    { id: 'ev-2003', type: 'activity', date: toIso(e3Date), title: 'Sports Day Preliminaries', location: 'Stadium', updatedAt: nowIso },
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
