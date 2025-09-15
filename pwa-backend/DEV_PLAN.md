# 後端開發計畫（Express on AWS Lambda via SAM）

依據 `docs/school-poc-feature-plan.md`，提供批次/增量 API 與離線友善設計，降低前端請求頻率。

## 目標
- 批次端點：以學期/日期區間一次取整包（transcripts、schedule、events、announcements、attendance）。
- 差異同步：所有資源回傳 `updatedAt`；支援 `?since=` 或 ETag（`If-None-Match`）。
- 提交健全：請假表單 `POST /leave-requests` 支援冪等鍵（Idempotency-Key）。
- 附件安全：公告附件以短時效簽名 URL；到期自動失效。
- 基礎授權：student/parent/teacher 角色與資源範圍檢核。

## 路由與控制器（最小雛形）
- `GET /me/transcripts?terms=YYYY-1,YYYY-2`
  - 回傳多學期成績；每科含 `updatedAt`、學期 GPA；支援 `?since=` 只回傳更新。
- `GET /schedule?term=YYYY-1`
  - 以學期為單位回傳課表；可 `?since=`。
- `GET /events?range=YYYY-MM-DD..YYYY-MM-DD` 或 `?term=current`
  - 回傳時間區間內事件；可 `?since=`。
- `GET /announcements?since=timestamp`
  - 差異同步公告；附件以簽名 URL 欄位。
- `POST /announcements/:id/read`
  - 記錄已讀（可接受離線佇列重送）。
- `GET /attendance?term=current`
  - 回傳整學期出缺勤。
- `GET /leave-requests?mine`
  - 回傳使用者的請假申請列表。
- `POST /leave-requests`
  - 受理請假；使用 `Idempotency-Key` 標頭避免重複；回傳 server `id` 與 `updatedAt`。
- `POST /leave-requests/:id/decision`（導師）
  - 審核通過/駁回；更新 `updatedAt`。

## 中介層與基礎設計
- 版本與 ETag：
  - 以資料行 `updatedAt` 產出 ETag（hash/版本號）；支援 `If-None-Match` 304。
- 差異同步：
  - 接受 `?since`（ISO timestamp）；DB 過濾 `updatedAt > since`。
- 冪等：
  - 讀取 `Idempotency-Key`，以 Redis 或 DB 表記錄處理結果，若重送則回覆先前結果。
- 安全：
  - JWT 或 Session（POC 可簡化）；角色檢核中介層（student/parent/teacher）。
- 效能：
  - 單次批量查詢與合併；合理分頁上限（如公告 200 筆/次）。

## 資料模型（摘要，對應資料表）
- transcripts(term, studentId, courses[{ courseId, name, credit, score, grade, rank }], gpa, updatedAt)
- schedule(term, entries[{ weekday, period, courseId, room, teacher }], updatedAt)
- events(id, type, date, title, courseId?, location?, updatedAt)
- announcements(id, title, body, attachments[{ key, name }], publishedAt, updatedAt)
- attendance(studentId, date, courseId, status, updatedAt)
- leave_requests(id, studentId, dateRange, reason, attachments?, status, updatedAt)
- idempotency_keys(key, requestHash, responseBody, statusCode, expiresAt)

## 測試計畫
- Jest + supertest：
  - 差異同步：`?since=` 僅返回增量；`If-None-Match` 回 304。
  - 冪等：相同 `Idempotency-Key` 重送不重複建單。
  - 授權：未授權/角色不符回 401/403。
  - 基礎效能：批次端點回傳時間在合理範圍（POC 斟酌）。

## 部署與配置
- SAM：`npm run package && npm run deploy`（需 AWS 憑證）。
- 環境變數：複製 `env.template` 為 `.env`，設定 DB、Redis、簽名 URL 參數（桶名/時效）。
- 開發：`npm run devstart`；本地 `npm start`。

## 里程碑
- M1：transcripts + schedule 端點（整學期批次；支援 `?since=`）。
- M2：announcements + events（附件簽名 URL 與已讀回報）。
- M3：attendance + leave-requests（含 Idempotency-Key、審核端點）。
- M4：ETag/304、快取標頭、角色授權與整體測試覆蓋。

