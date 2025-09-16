# Backend TODO Items (by Milestone)

## M1 transcripts + schedule (batch and diff sync)
- [x] Add routes: `GET /me/transcripts?terms=`, `GET /schedule?term=`
 - [x] Controllers: batch query and return `updatedAt`
 - [x] Support `?since=` (ISO timestamp) for incremental filtering
 

## M2 announcements + events (attachment signed URLs)
- [x] Add routes: `GET /announcements?since=`, `POST /announcements/:id/read`, `GET /events?range=`
- [x] Service: generate announcement attachment signed URLs (S3 or equivalent implementation; POC can return mock data structure)
- [x] Read status reporting (deduplication logic, user level)

## M3 attendance + leave-requests (idempotency)
- [x] Add routes: `GET /attendance?term=`, `GET /leave-requests?mine`, `POST /leave-requests`, `POST /leave-requests/:id/decision`
- [x] `POST /leave-requests` supports `Idempotency-Key` (Redis cache replay)
- [x] Role validation: only teachers can approve; students limited to own data (POC: Header override `x-user-role`)
 

## M4 robustness and performance
- [ ] Middleware: ETag generation and `If-None-Match` handling (304)
- [ ] Unified API pagination/limits (announcements/events) and reasonable indexing
- [ ] Cache headers/Cache-Control and expiration strategy (static and cacheable data)
- [ ] Documentation: endpoint descriptions, query parameters, example responses, error codes

## Configuration and security
- [ ] Create `pwa-backend/.env` (copy from `env.template`) and configure required variables
- [ ] Local development script confirmation: `npm run devstart` / `npm start`
- [ ] SAM packaging/deployment script confirmation: `npm run package && npm run deploy`