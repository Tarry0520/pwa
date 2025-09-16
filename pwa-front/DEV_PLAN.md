# Frontend Development Plan (Quasar PWA)

This plan is based on `docs/school-poc-feature-plan.md`, implementing four priority features with offline-first strategy.

## Goals
- Routes and pages: transcripts, schedule/calendar, announcements/attachments, attendance/leave requests.
- Offline capability: Service Worker + IndexedDB; GET uses Stale-While-Revalidate, POST uses Background Sync.
- Load reduction: batch sync by "term/date range", supports `?since=` or ETag.

## Architecture and Modules
- Pages:
  - `src/pages/TranscriptPage.vue`
  - `src/pages/SchedulePage.vue`
  - `src/pages/AnnouncementsPage.vue`
  - `src/pages/AttendancePage.vue`
- State (Pinia stores):
  - `src/stores/transcripts.ts`
  - `src/stores/schedule.ts`
  - `src/stores/announcements.ts`
  - `src/stores/attendance.ts`
- Services:
  - `src/services/db.ts`: IndexedDB wrapper (recommend `idb` or `localForage`).
  - `src/services/api.ts`: offline-first GET, diff sync, ETag, unified error/retry handling.
- Service Worker (basic version exists):
  - `src-pwa/custom-service-worker.js`: add Background Sync, attachment CacheFirst, versioned cache cleanup.

## Sync and Cache Strategy (Implementation Points)
- GET flow:
  1) Read IndexedDB first for display;
  2) Send with `?since=lastUpdatedAt` or `If-None-Match`;
  3) Write back to IndexedDB and update `lastSyncedAt`, UI shows time.
- Merge strategy:
  - Use response `updatedAt` for conflict resolution; overwrite if local is older; maintain index and sort stability.
- POST flow:
  - Offline write to `leaveQueue` queue (including `tempId`/`idempotencyKey`); SW Background Sync resend; delete queue and update local cache after success.
- Cache:
  - Attachments and static resources use CacheFirst; API uses Stale-While-Revalidate.

## Feature Milestones
- M1 Transcripts (offline capable)
  - Page + store + db schema; recent two academic years prefetch; last sync time; PDF export.
- M2 Schedule/Calendar + Announcements
  - Schedule term cache; calendar monthly incremental; announcement text IndexedDB; attachment SW CacheFirst.
- M3 Attendance + Leave Requests (including Background Sync)
  - Attendance full term cache; leave request offline submission, auto retry, conflict prompts.
- M4 Experience and Robustness
  - Offline badge, error/conflict prompts, skeleton screen; basic accessibility and mobile experience.

## IndexedDB Data Model (Summary)
- transcripts: { term, courses: [{ courseId, name, credit, score, grade, rank, updatedAt }], gpa, lastSyncedAt }
- schedule: [{ weekday, period, courseId, room, teacher, updatedAt }], lastSyncedAt
- events: [{ id, type, date, title, courseId?, location?, updatedAt }], lastSyncedAt
- announcements: [{ id, title, body, attachments:[{url,name}], publishedAt, updatedAt, read }], lastSyncedAt
- attendance: [{ date, courseId, status, updatedAt }], lastSyncedAt
- leaveQueue: [{ tempId, payload, idempotencyKey, createdAt, status }]

## UI and Usability
- Each page provides: last sync time, refresh button, offline badge.
- Display error/conflict prompts (retry and rollback options), skeleton screen and empty states.
- Transcripts provide frontend PDF export and print-friendly styling.

## Testing and Acceptance
- Unit: stores merge/incremental logic; api.ts `?since=` and ETag branches.
- Simulation: DevTools Offline can still browse synced data; refresh doesn't lose data; Background Sync submission syncs local state after success.

## Development Commands
- Development: `npm run dev:pwa`
- Build: `npm run build:pwa`
- Lint/Format: `npm run lint` / `npm run format`
