# 後端待辦事項（按里程碑）

## M1 transcripts + schedule（批次與差異同步）
- [x] 新增路由：`GET /me/transcripts?terms=`、`GET /schedule?term=`
 - [x] 控制器：批次查詢與回傳 `updatedAt`
 - [x] 支援 `?since=`（ISO timestamp）過濾增量
 

## M2 announcements + events（附件簽名 URL）
- [x] 新增路由：`GET /announcements?since=`、`POST /announcements/:id/read`、`GET /events?range=`
- [x] 服務：產生公告附件簽名 URL（S3 或等效實作；POC 可回傳假資料結構）
- [x] 已讀回報寫入（可去重邏輯，使用者層級）

## M3 attendance + leave-requests（冪等）
- [ ] 新增路由：`GET /attendance?term=`、`GET /leave-requests?mine`、`POST /leave-requests`、`POST /leave-requests/:id/decision`
- [ ] `POST /leave-requests` 支援 `Idempotency-Key`（記錄表或 Redis）
- [ ] 角色檢核：導師才可審核；學生限看本人資料
 

## M4 健全與效能
- [ ] 中介層：ETag 生成與 `If-None-Match` 處理（304）
- [ ] 統一 API 分頁/上限（公告/事件）與合理索引
- [ ] 快取標頭/Cache-Control 與過期策略（靜態與可快取資料）
- [ ] 文檔：端點說明、查詢參數、範例回應、錯誤碼

## 配置與安全
- [ ] 建立 `pwa-backend/.env`（由 `env.template` 複製）並配置必要變數
- [ ] 本地開發腳本確認：`npm run devstart` / `npm start`
- [ ] SAM 打包/部署腳本確認：`npm run package && npm run deploy`
