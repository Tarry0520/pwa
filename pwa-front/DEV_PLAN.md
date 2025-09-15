# 前端開發計畫（Quasar PWA）

本計畫依據 `docs/school-poc-feature-plan.md`，落實四個優先功能與離線優先策略。

## 目標
- 路由與頁面：成績單、課表/行事曆、公告/附件、出缺勤/請假。
- 離線能力：Service Worker + IndexedDB；GET 採 Stale-While-Revalidate，POST 以 Background Sync。
- 降載：以「學期/日期區間」批次同步，支援 `?since=` 或 ETag。

## 架構與模組
- 頁面：
  - `src/pages/TranscriptPage.vue`
  - `src/pages/SchedulePage.vue`
  - `src/pages/AnnouncementsPage.vue`
  - `src/pages/AttendancePage.vue`
- 狀態（Pinia stores）：
  - `src/stores/transcripts.ts`
  - `src/stores/schedule.ts`
  - `src/stores/announcements.ts`
  - `src/stores/attendance.ts`
- 服務：
  - `src/services/db.ts`：封裝 IndexedDB（建議 `idb` 或 `localForage`）。
  - `src/services/api.ts`：離線優先 GET、差異同步、ETag、錯誤/重試統一處理。
- Service Worker（已存在基礎版）：
  - `src-pwa/custom-service-worker.js`：增補 Background Sync、附件 CacheFirst、版本化快取清理。

## 同步與快取策略（實作要點）
- GET 流程：
  1) 先讀 IndexedDB 呈現；
  2) 以 `?since=lastUpdatedAt` 或 `If-None-Match` 發送；
  3) 回寫 IndexedDB 並更新 `lastSyncedAt`，UI 顯示時間。
- 合併策略：
  - 以回應 `updatedAt` 作為衝突仲裁；本地較舊即覆蓋；維持索引與排序穩定。
- POST 流程：
  - 離線寫入 `leaveQueue` 佇列（含 `tempId`/`idempotencyKey`）；SW Background Sync 重送；成功後對應刪除佇列並更新本地快取。
- 快取：
  - 附件與靜態資源採 CacheFirst；API 採 Stale-While-Revalidate。

## 功能里程碑
- M1 成績單（可離線）
  - 頁面 + store + db schema；近兩學年預取；最後同步時間；PDF 匯出。
- M2 課表/行事曆 + 公告
  - 課表學期快取；行事曆按月增量；公告文字 IndexedDB；附件 SW CacheFirst。
- M3 出缺勤 + 請假（含 Background Sync）
  - 出缺勤整學期快取；請假單離線提交、自動重試、衝突提示。
- M4 體驗與健全
  - 離線徽章、錯誤/衝突提示、骨架屏；基本無障礙與行動體驗。

## IndexedDB 資料模型（摘要）
- transcripts: { term, courses: [{ courseId, name, credit, score, grade, rank, updatedAt }], gpa, lastSyncedAt }
- schedule: [{ weekday, period, courseId, room, teacher, updatedAt }], lastSyncedAt
- events: [{ id, type, date, title, courseId?, location?, updatedAt }], lastSyncedAt
- announcements: [{ id, title, body, attachments:[{url,name}], publishedAt, updatedAt, read }], lastSyncedAt
- attendance: [{ date, courseId, status, updatedAt }], lastSyncedAt
- leaveQueue: [{ tempId, payload, idempotencyKey, createdAt, status }]

## UI 與可用性
- 每頁提供：最後同步時間、刷新按鈕、離線徽章。
- 顯示錯誤/衝突提示（重試與回滾選項）、骨架屏與空狀態。
- 成績單提供前端 PDF 匯出與列印友善版樣式。

## 測試與驗收
- 單元：stores 的合併/增量邏輯；api.ts 的 `?since=` 與 ETag 分支。
- 模擬：DevTools Offline 仍能瀏覽已同步資料；重整不丟失；Background Sync 提交成功後本地狀態同步。

## 開發命令
- 開發：`npm run dev:pwa`
- 建置：`npm run build:pwa`
- Lint/Format：`npm run lint` / `npm run format`

