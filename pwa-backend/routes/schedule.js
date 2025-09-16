const express = require('express')
const router = express.Router()
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')

function sampleSchedule(term) {
  const now = new Date().toISOString()
  return {
    term,
    updatedAt: now,
    entries: [
      { weekday: 1, period: 1, courseId: `${term}-MATH101`, room: 'A101', teacher: 'Mr. Wang', updatedAt: now },
      { weekday: 1, period: 2, courseId: `${term}-CS101`, room: 'Lab-1', teacher: 'Mr. Chen', updatedAt: now },
      { weekday: 2, period: 3, courseId: `${term}-PHYS101`, room: 'B203', teacher: 'Ms. Chang', updatedAt: now },
    ],
  }
}

// GET /schedule?term=YYYY-1[&since=iso]
router.get('/schedule', async (req, res) => {
  const { term, since } = req.query
  if (!term) return validationErrorResponse(res, 'term is required, e.g. 2025-1')
  const sinceDate = since ? new Date(since) : null
  const data = sampleSchedule(term)
  if (sinceDate && !isNaN(sinceDate.getTime())) {
    const entries = (data.entries || []).filter(
      (e) => new Date(e.updatedAt).getTime() > sinceDate.getTime(),
    )
    if (entries.length === 0) {
      return successResponse(res, 200, 'Schedule fetched', { term, updatedAt: data.updatedAt, entries: [] })
    }
    const latest = entries.reduce(
      (acc, e) => (new Date(e.updatedAt) > new Date(acc) ? e.updatedAt : acc),
      data.updatedAt,
    )
    return successResponse(res, 200, 'Schedule fetched', { term, updatedAt: latest, entries })
  }
  return successResponse(res, 200, 'Schedule fetched', data)
})

module.exports = router
