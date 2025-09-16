# Frontend TODO Items (by Milestone)

## M1 Transcripts (Offline First)
- [x] Add route and page `src/pages/TranscriptPage.vue`
- [x] Create store `src/stores/transcripts.ts` (state: items, lastSyncedAt; actions: loadFromDb, sync, exportPdf)
- [x] Create `src/services/db.ts` (transcripts table; basic CRUD and indexing)
- [x] Create `src/services/api.ts` (GET `/me/transcripts?terms=`; offline first with `?since=` support)
- [x] Page UI: skeleton screen, last sync time, dropdown/button refresh
- [x] PDF export styling and functionality (works offline)
 - [x] Recent two academic years prefetch (terms suggestion value generation)

Note: ETag/If-None-Match (304) implementation deferred to M4 per DEV_PLAN; M1 only needs `?since=` incremental.

## M2 Schedule/Calendar + Announcements
- [x] Add `src/pages/SchedulePage.vue` and store `src/stores/schedule.js`
- [x] Add `src/pages/AnnouncementsPage.vue` and store `src/stores/announcements.js`
- [x] db.js: schedule, events, announcements table structure
- [x] api.js: `GET /schedule?term=`, `GET /events?range=`, `GET /announcements?since=`
- [x] SW: attachment CacheFirst; cleanup old attachment cache
- [x] UI: announcement read status localization and incremental sync

## M3 Attendance + Leave Requests (including Background Sync)
- [x] Add `src/pages/AttendancePage.vue` and store `src/stores/attendance.js`
- [x] db.js: attendance table and leaveQueue queue
- [x] api.js: `GET /attendance?term=`, `GET /leave-requests?mine`, `POST /leave-requests`
- [ ] SW: Background Sync queue and retry, idempotencyKey support (pending)
- [x] UI: offline leave request form, queue submission prompt and basic conflict handling

## M4 Experience and Robustness
- [ ] Offline badge and global network status indicator
- [ ] Error/conflict prompts, retry and rollback
- [ ] Accessibility details, mobile interaction (button size, touch areas)
 

## Additional
- [ ] Adjust `src-pwa/custom-service-worker.js`: add Background Sync, cache group naming and version cleanup
- [ ] Confirm PWA injection file paths and manifest settings per quasar.config.js
- [ ] Implement segmented loading and status prompts for large data (terms)