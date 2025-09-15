# 校務系統 POC 功能與離線策略計畫

本文檔紀錄校務系統 POC 之優先功能、離線/同步策略與前後端最小實作計畫，用於對齊範圍、降載設計與開發路線。

## 目標與原則
- 離線優先：核心資料皆可離線瀏覽與操作（表單離線排隊送出）。
- 降低 API 負載：以「整學期/區段」批次同步，支援差異更新；避免高頻零碎請求。
- 明確更新點：所有資料皆包含 `updatedAt` 或 ETag，支援 `?since=` 差異同步。
- 安全與權限：學生/家長/教師角色分層；附件以短時效簽名 URL。

## 優先功能（4 項）

### 1) 成績單查看（Transcript）
- 用途：
  - 學生/家長查看各學期科目成績、學分、GPA、名次；教師可看任課班級摘要（第二階段）。
- 離線策略：
  - 首次登入預取近兩學年的成績至 IndexedDB；超過 7 天或手動才同步。
  - 可離線檢視；支援前端生成 PDF 匯出/列印。
- 最小 API：
  - `GET /me/transcripts?terms=YYYY-1,YYYY-2`（批次多學期）
  - `GET /classes/:id/grade-summary`（教師用，可延後）
- 資料模型（摘要）：
  - Transcript { term, courses: [{ courseId, name, credit, score, grade, rank, updatedAt }], gpa }

### 2) 課表與學期行事曆（Schedule & Calendar）
- 用途：
  - 顯示每日課程、教室與任課教師；檢視學期事件（考試/作業/活動）。
- 離線策略：
  - 課表以學期為單位一次下載；行事曆按月/學期快取。
  - 本地提醒（Notifications API）；線上時再取增量更新。
- 最小 API：
  - `GET /schedule?term=current`
  - `GET /events?range=YYYY-MM-DD..YYYY-MM-DD` 或 `?term=current`
- 資料模型（摘要）：
  - ScheduleEntry { weekday, period, courseId, room, teacher, updatedAt }
  - Event { id, type, date, title, courseId?, location?, updatedAt }

### 3) 校務公告與附件檔案櫃（Announcements & Files）
- 用途：
  - 公告瀏覽、已讀狀態、附件下載；離線可閱讀已快取內容與附件。
- 離線策略：
  - 公告文字存 IndexedDB；附件用 Service Worker Cache First（可離線開啟）。
  - 已讀回報離線排隊，恢復連線後背景同步。
- 最小 API：
  - `GET /announcements?since=timestamp`（差異同步）
  - `POST /announcements/:id/read`
  - 附件以簽名 URL（短時效）
- 資料模型（摘要）：
  - Announcement { id, title, body, attachments: [{ url, name }], publishedAt, updatedAt, read }

### 4) 出缺勤紀錄與請假申請（Attendance & Leave）
- 用途：
  - 學生查看每日出缺勤；可提交請假單；導師審核（可第二階段）。
- 離線策略：
  - 出缺勤紀錄整學期快取；請假表單離線可填寫，SW Background Sync 送出。
  - 衝突處理採最後寫入為準，伺服器時間戳仲裁。
- 最小 API：
  - `GET /attendance?term=current`
  - `GET /leave-requests?mine`
  - `POST /leave-requests`
  - `POST /leave-requests/:id/decision`（導師）
- 資料模型（摘要）：
  - Attendance { date, courseId, status, updatedAt }
  - LeaveRequest { id|tempId, dateRange, reason, attachments?, status, updatedAt }

## 同步與快取策略
- 儲存層：主要使用 IndexedDB（建議 `idb` 或 `localForage`），Pinia 僅存輕量快照與 UI 狀態。
- GET：採 Stale-While-Revalidate；支援 `?since=` 或 `If-None-Match`/ETag 做差異更新。
- POST：表單離線入佇列，透過 Workbox Background Sync 重送；提供重試與故障回饋。
- 批次與分頁：以「學期」或「日期區間」為主，降低請求頻率。
- 手動刷新：每頁提供「下拉刷新」與「最後同步時間」顯示；錯誤與衝突明確提示。

## 前端（Quasar PWA）實作規劃
- 路由頁面：
  - `/transcript`、`/schedule`、`/announcements`、`/attendance`
- 目錄與檔案（建議）：
  - `src/pages/TranscriptPage.vue`
  - `src/pages/SchedulePage.vue`
  - `src/pages/AnnouncementsPage.vue`
  - `src/pages/AttendancePage.vue`
  - `src/stores/transcripts.ts`
  - `src/stores/schedule.ts`
  - `src/stores/announcements.ts`
  - `src/stores/attendance.ts`
  - `src/services/api.ts`（封裝離線優先、ETag/Since、錯誤處理）
  - `src/services/db.ts`（IndexedDB 封裝）
  - `src-pwa/custom-service-worker.js`（Workbox：CacheFirst、Background Sync）
- UI 重點：骨架屏、離線徽章、最後同步時間、刷新按鈕、錯誤/衝突提示、附件離線標記。

## 後端最小增補
- 資源欄位：所有資料含 `updatedAt`；支援 `?since=` 或 ETag。
- 批次 API：盡量提供「整學期」或「時間區間」的批次讀取端點。
- 附件：以短時效簽名 URL 提供下載；限制有效期與權限。
- 角色與授權：student/parent/teacher 分層；跨角色資料需嚴格校驗。

## 里程碑與驗收（建議）
- M1：建置路由頁面雛形、Pinia stores、IndexedDB 與 SW 基礎；成績單頁可離線瀏覽。
- M2：課表/行事曆與公告快取與差異同步完成；附件可離線開啟。
- M3：出缺勤整學期快取、請假表單離線提交與背景同步；錯誤回復流程。
- M4：教師端摘要（可選）、PDF 匯出與列印最佳化、基本無障礙與行動體驗調整。

## 後續擴充（暫定）
- 推播（Web Push）與細緻通知偏好。
- 多語系與時區；行事曆與本地假日整合。
- 更細的同步與合併策略（例如 per-course 版本向量）。

---
最後更新：初始化版本（由功能規劃彙整產出）。
