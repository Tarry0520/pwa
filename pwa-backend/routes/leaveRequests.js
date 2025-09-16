const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const { requireRole } = require('../middleware/roles')
const { successResponse, validationErrorResponse, errorResponse } = require('../utils/responseFormatter')
const { getStored, store } = require('../services/idempotencyService')

// In-memory POC store for leave requests
const requests = new Map() // id -> record

function listMine(userId) {
  const out = []
  for (const r of requests.values()) {
    if (r.userId === userId) out.push(r)
  }
  return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

function createId() {
  return `lr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// GET /leave-requests?mine
router.get('/leave-requests', authenticateToken, async (req, res) => {
  const { mine } = req.query
  if (mine) {
    const items = listMine(req.user.id)
    return successResponse(res, 200, 'Leave requests fetched', { items })
  }
  return errorResponse(res, 400, 'Unsupported query')
})

// POST /leave-requests (Idempotency-Key supported)
router.post('/leave-requests', authenticateToken, async (req, res) => {
  const idemKey = req.headers['idempotency-key']
  if (idemKey) {
    const cached = await getStored(idemKey)
    if (cached) {
      return successResponse(res, cached.statusCode || 200, 'Idempotent replay', cached.payload)
    }
  }

  const { dateRange, reason, attachments } = req.body || {}
  if (!dateRange || !dateRange.start || !dateRange.end) return validationErrorResponse(res, 'dateRange with start and end is required')
  if (!reason) return validationErrorResponse(res, 'reason is required')

  const now = new Date().toISOString()
  const record = {
    id: createId(),
    userId: req.user.id,
    studentId: req.user.student_id,
    dateRange,
    reason,
    attachments: Array.isArray(attachments) ? attachments : [],
    status: 'pending',
    updatedAt: now,
    createdAt: now,
  }
  requests.set(record.id, record)

  const payload = { item: record }
  if (idemKey) await store(idemKey, payload, 201)
  return successResponse(res, 201, 'Leave request created', payload)
})

// POST /leave-requests/:id/decision  { decision: 'approved'|'rejected', note? }
router.post('/leave-requests/:id/decision', authenticateToken, requireRole(['teacher']), async (req, res) => {
  const { id } = req.params
  const { decision, note } = req.body || {}
  const item = requests.get(id)
  if (!item) return errorResponse(res, 404, 'Leave request not found')
  if (!['approved', 'rejected'].includes(decision)) return validationErrorResponse(res, 'Invalid decision')
  item.status = decision
  item.note = note || null
  item.updatedAt = new Date().toISOString()
  requests.set(id, item)
  return successResponse(res, 200, 'Decision applied', { item })
})

module.exports = router
