const express = require('express')
const router = express.Router()
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')

function sampleTranscript(term) {
  const now = new Date().toISOString()
  return {
    term,
    gpa: 3.7,
    updatedAt: now,
    courses: [
      { courseId: `${term}-MATH101`, name: '微積分', credit: 3, score: 92, grade: 'A', rank: 5, updatedAt: now },
      { courseId: `${term}-PHYS101`, name: '普通物理', credit: 2, score: 85, grade: 'B+', rank: 12, updatedAt: now },
      { courseId: `${term}-CS101`, name: '程式設計', credit: 3, score: 95, grade: 'A', rank: 2, updatedAt: now },
    ],
  }
}

// GET /me/transcripts?terms=YYYY-1,YYYY-2&since=iso
router.get('/me/transcripts', async (req, res) => {
  const { terms, since } = req.query
  const termList = (terms ? String(terms).split(',') : []).filter(Boolean)
  if (!termList.length) {
    return validationErrorResponse(res, 'terms 參數必填，例如 2024-1,2024-2')
  }

  const sinceDate = since ? new Date(since) : null
  const items = termList
    .map((t) => sampleTranscript(t))
    .map((item) => {
      if (!sinceDate || isNaN(sinceDate.getTime())) return item
      // 過濾課程增量：僅保留 updatedAt > since 的課程
      const filteredCourses = (item.courses || []).filter(
        (c) => new Date(c.updatedAt).getTime() > sinceDate.getTime(),
      )
      if (filteredCourses.length === 0) return null
      const latest = filteredCourses.reduce(
        (acc, c) => (new Date(c.updatedAt) > new Date(acc) ? c.updatedAt : acc),
        item.updatedAt,
      )
      return { ...item, courses: filteredCourses, updatedAt: latest }
    })
    .filter(Boolean)

  return successResponse(res, 200, 'Transcripts fetched', { items, since: since || null })
})

module.exports = router
