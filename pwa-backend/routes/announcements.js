const express = require('express')
const router = express.Router()
const { successResponse, validationErrorResponse } = require('../utils/responseFormatter')
const { authenticateToken } = require('../middleware/auth')
const { markAsRead } = require('../services/announcementService')
const crypto = require('crypto')

// Simple signer to simulate short-lived signed URLs for attachments
function signAttachmentUrl(key, { expiresInSec = 300 } = {}) {
  const baseUrl = process.env.ATTACH_BASE_URL || 'https://files.example.com'
  const secret = process.env.ATTACH_SIGN_SECRET || 'devsecret'
  const exp = Math.floor(Date.now() / 1000) + expiresInSec
  const payload = `${key}:${exp}`
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const url = `${baseUrl}/attachments/${encodeURIComponent(key)}?exp=${exp}&sig=${token}`
  return { url, expiresAt: new Date(exp * 1000).toISOString() }
}

function sampleAnnouncements() {
  const now = new Date()
  const nowIso = now.toISOString()
  const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const items = [
    {
      id: 'a-1001',
      title: '開學注意事項',
      body: '請留意開學日期與課表調整。',
      attachments: [
        { key: 'a-1001/handbook.pdf', name: '新生手冊.pdf' },
        { key: 'a-1001/schedule.png', name: '課表示意圖.png' },
      ],
      publishedAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'a-1002',
      title: '系學會活動報名',
      body: '本週五截止，名額有限，敬請把握。',
      attachments: [{ key: 'a-1002/poster.jpg', name: '活動海報.jpg' }],
      publishedAt: nowIso,
      updatedAt: nowIso,
    },
  ]
  // Attach signed URLs
  return items.map((it) => ({
    ...it,
    attachments: (it.attachments || []).map((att) => {
      const { url, expiresAt } = signAttachmentUrl(att.key)
      return { ...att, signedUrl: url, expiresAt }
    }),
  }))
}

// GET /announcements?since=timestamp
router.get('/announcements', async (req, res) => {
  const { since } = req.query
  const sinceDate = since ? new Date(since) : null
  let items = sampleAnnouncements()
  if (sinceDate && !isNaN(sinceDate.getTime())) {
    items = items.filter((a) => new Date(a.updatedAt).getTime() > sinceDate.getTime())
  }
  return successResponse(res, 200, 'Announcements fetched', {
    items,
    since: since || null,
  })
})

// POST /announcements/:id/read
router.post('/announcements/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params
  if (!id) return validationErrorResponse(res, '缺少公告 ID')

  // User-level dedup only
  const userId = req.user?.id
  if (!userId) return validationErrorResponse(res, '未授權的請求')

  try {
    const result = await markAsRead({ announcementId: id, userId })
    const message = result.duplicated ? 'Already marked as read' : 'Marked as read'
    return successResponse(res, 200, message, { id, readAt: result.readAt, duplicated: result.duplicated })
  } catch (e) {
    return validationErrorResponse(res, '標記已讀失敗')
  }
})

module.exports = router
