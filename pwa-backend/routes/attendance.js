const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')

function sampleAttendance(term, studentId) {
  // POC: generate a few attendance records within the term window
  // Assume term like '2025-1' meaning first semester (Sep–Jan) for example purposes
  const now = new Date()
  const year = Number(String(term).split('-')[0]) || now.getFullYear()
  const months = String(term).endsWith('-2') ? [2, 3, 4, 5] : [8, 9, 10, 11]
  const dates = []
  for (const m of months) {
    const d = new Date(Date.UTC(year, m, 5))
    dates.push(new Date(d))
  }
  const updatedAt = new Date().toISOString()
  return dates.map((d, i) => ({
    id: `${studentId}-${d.toISOString().slice(0, 10)}`,
    studentId,
    date: d.toISOString(),
    courseId: `${year}-MATH10${i}`,
    status: i % 3 === 0 ? 'absent' : i % 3 === 1 ? 'late' : 'present',
    updatedAt,
  }))
}

// GET /attendance?term=YYYY-1
router.get('/attendance', authenticateToken, async (req, res) => {
  const { term } = req.query
  if (!term) return validationErrorResponse(res, 'term is required')
  const studentId = req.user?.student_id
  const items = sampleAttendance(term, studentId)
  return successResponse(res, 200, 'Attendance fetched', { term, items })
})

module.exports = router
