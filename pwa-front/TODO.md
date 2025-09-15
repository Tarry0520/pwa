# 前端待辦事項（按里程碑）

## M1 成績單（離線優先）
- [x] 新增路由與頁面 `src/pages/TranscriptPage.vue`
- [x] 建立 store `src/stores/transcripts.ts`（state：items、lastSyncedAt；actions：loadFromDb、sync、exportPdf）
- [x] 建立 `src/services/db.ts`（transcripts 表；基本 CRUD 與索引）
- [x] 建立 `src/services/api.ts`（GET `/me/transcripts?terms=`；離線優先與 `?since=` 支援）
- [x] 頁面 UI：骨架屏、最後同步時間、下拉/按鈕刷新
- [x] PDF 匯出樣式與功能（無網也可用）
 - [x] 近兩學年預取（terms 建議值產生）

備註：ETag/If-None-Match（304）依 DEV_PLAN 延至 M4 實作；M1 僅需 `?since=` 增量。

## M2 課表/行事曆 + 公告
- [ ] 新增 `src/pages/SchedulePage.vue` 與 store `src/stores/schedule.ts`
- [ ] 新增 `src/pages/AnnouncementsPage.vue` 與 store `src/stores/announcements.ts`
- [ ] db.ts：schedule、events、announcements 表結構
- [ ] api.ts：`GET /schedule?term=`、`GET /events?range=`、`GET /announcements?since=`
- [ ] SW：附件 CacheFirst；清理舊版附件快取
- [ ] UI：公告已讀狀態本地化與增量同步

## M3 出缺勤 + 請假（含 Background Sync）
- [ ] 新增 `src/pages/AttendancePage.vue` 與 store `src/stores/attendance.ts`
- [ ] db.ts：attendance 表與 leaveQueue 佇列
- [ ] api.ts：`GET /attendance?term=`、`GET /leave-requests?mine`、`POST /leave-requests`
- [ ] SW：Background Sync 佇列與重試、idempotencyKey 支援
- [ ] UI：離線填寫請假單、送出佇列提示與衝突處理

## M4 體驗與健全
- [ ] 離線徽章與全域網路狀態提示
- [ ] 錯誤/衝突提示、重試與回滾
- [ ] 無障礙細節、行動端互動（按鈕大小、觸控區）
- [ ] 單元測試（stores、api）與基本文件更新

## 補充
- [ ] 調整 `src-pwa/custom-service-worker.js`：加入 Background Sync、快取分組命名與版本清理
- [ ] 依 quasar.config.js 確認 PWA 注入檔路徑與 manifest 設置
- [ ] 針對大資料（學期）實作分段載入與狀態提示
