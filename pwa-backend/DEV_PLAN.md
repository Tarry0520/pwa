# Backend Development Plan (Express on AWS Lambda via SAM)

Based on `docs/school-poc-feature-plan.md`, providing batch/incremental APIs and offline-friendly design to reduce frontend request frequency.

## Goals
- Batch endpoints: fetch entire packages by term/date range (transcripts, schedule, events, announcements, attendance).
- Diff sync: all resources return `updatedAt`; support `?since=` or ETag (`If-None-Match`).
- Submission robustness: leave request form `POST /leave-requests` supports idempotency key (Idempotency-Key).
- Attachment security: announcement attachments with short-lived signed URLs; auto-expire.
- Basic authorization: student/parent/teacher roles and resource scope validation.

## Routes and Controllers (minimal prototype)
- `GET /me/transcripts?terms=YYYY-1,YYYY-2`
  - Return multi-term grades; each subject includes `updatedAt`, term GPA; support `?since=` for updates only.
- `GET /schedule?term=YYYY-1`
  - Return schedule by term; supports `?since=`.
- `GET /events?range=YYYY-MM-DD..YYYY-MM-DD` or `?term=current`
  - Return events within time range; supports `?since=`.
- `GET /announcements?since=timestamp`
  - Diff sync announcements; attachments with signed URL fields.
- `POST /announcements/:id/read`
  - Record read status (accepts offline queue resend).
- `GET /attendance?term=current`
  - Return entire term attendance.
- `GET /leave-requests?mine`
  - Return user's leave request list.
- `POST /leave-requests`
  - Accept leave requests; use `Idempotency-Key` header to avoid duplicates; return server `id` and `updatedAt`.
- `POST /leave-requests/:id/decision` (teachers)
  - Approve/reject; update `updatedAt`.

## Middleware and Basic Design
- Version and ETag:
  - Generate ETag from data row `updatedAt` (hash/version number); support `If-None-Match` 304.
- Diff sync:
  - Accept `?since` (ISO timestamp); DB filter `updatedAt > since`.
- Idempotency:
  - Read `Idempotency-Key`, record processing results in Redis or DB table, return previous result if resent.
- Security:
  - JWT or Session (POC can simplify); role validation middleware (student/parent/teacher).
- Performance:
  - Single batch query and merge; reasonable pagination limits (e.g., announcements 200 items/batch).

## Data Models (summary, corresponding tables)
- transcripts(term, studentId, courses[{ courseId, name, credit, score, grade, rank }], gpa, updatedAt)
- schedule(term, entries[{ weekday, period, courseId, room, teacher }], updatedAt)
- events(id, type, date, title, courseId?, location?, updatedAt)
- announcements(id, title, body, attachments[{ key, name }], publishedAt, updatedAt)
- attendance(studentId, date, courseId, status, updatedAt)
- leave_requests(id, studentId, dateRange, reason, attachments?, status, updatedAt)
- idempotency_keys(key, requestHash, responseBody, statusCode, expiresAt)

## Testing Plan
- Jest + supertest:
  - Diff sync: `?since=` returns only increments; `If-None-Match` returns 304.
  - Idempotency: same `Idempotency-Key` resend doesn't create duplicates.
  - Authorization: unauthorized/role mismatch returns 401/403.
  - Basic performance: batch endpoints return within reasonable time (POC discretion).

## Deployment and Configuration
- SAM: `npm run package && npm run deploy` (requires AWS credentials).
- Environment variables: copy `env.template` to `.env`, set DB, Redis, signed URL parameters (bucket name/timeout).
- Development: `npm run devstart`; local `npm start`.

## Milestones
- M1: transcripts + schedule endpoints (full term batch; support `?since=`).
- M2: announcements + events (attachment signed URLs and read reporting).
- M3: attendance + leave-requests (including Idempotency-Key, approval endpoints).
- M4: ETag/304, cache headers, role authorization and overall test coverage.
