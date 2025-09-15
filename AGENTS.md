# 儲存庫指南

## 專案結構與模組組織
- `pwa-front/` — Quasar (Vue 3) PWA；原始碼位於 `src/`，PWA 配置位於 `src-pwa/`，建置輸出位於 `dist/`。
- `pwa-backend/` — 基於 AWS Lambda 的 Express（透過 SAM）；路由位於 `routes/`，控制器位於 `controllers/`，服務位於 `services/`，入口點為 `lambda.js`/`bin/www`。
- `docker/` — 本地資料卷；MySQL/Redis 的組合檔案位於儲存庫根目錄（`docker-compose*.yaml`）。
- 腳本：根目錄 `deploy-ec2.sh`，`pwa-front/publish.sh`，後端 `deploy.sh`。

## 建置、測試與開發指令
- 前端
  - `cd pwa-front && npm run dev` — 本地執行應用程式（或 `npm run dev:pwa`）。
  - `npm run build` — 生產環境建置（PWA 使用 `build:pwa`）。
  - `npm run lint` / `npm run format` — ESLint 和 Prettier。
- 後端
  - `cd pwa-backend && npm run devstart` — 使用 nodemon 執行 API。
  - `npm run package && npm run deploy` — SAM 打包/部署（需要 AWS 憑證）。
  - `npm start` — 本地啟動 Express 伺服器。
- 資料庫
  - `docker-compose up -d` — 本地啟動 MySQL/Redis。EC2 使用 `docker-compose.ec2.yaml`。

## 程式碼風格與命名慣例
- 縮排：2 個空格；UTF-8；LF 行尾符號。
- 前端：由 `eslint.config.js` 和 `.prettierrc.json` 強制執行。元件使用 `PascalCase.vue`；組合式函數/狀態管理使用 `camelCase`。
- 後端：Node/Express 風格；變數/函數偏好 `camelCase`，類別使用 `PascalCase`。
- 保持模組小巧，新增時將測試/文件與程式碼放在一起。

## 測試指南
- 目前狀態：最少測試。如需新增：
  - 前端：Vitest + Vue Test Utils；檔案 `*.spec.ts|js` 位於 `src/` 或 `tests/` 下。
  - 後端：Jest + supertest；檔案 `*.spec.js` 位於 `tests/` 下。
  - 為每個套件新增 `test` 腳本，並針對服務和關鍵路由追求有意義的覆蓋率。

## 提交與 Pull Request 指南
- 提交：使用祈使語氣，簡潔摘要（<72 字元）；引用問題（`#123`）。歡迎使用慣例前綴（`feat:`、`fix:`）。
- PR：清楚描述，連結問題，UI 的截圖/GIF，API 變更需文件化，以及測試步驟。行為變更時更新 README/配置說明。

## 安全性與配置提示
- 將 `pwa-backend/env.template` 複製為 `.env`；不要提交機密資訊。為 SAM 部署配置 AWS 憑證。
- 暴露的資料庫連接埠僅供開發使用；生產環境需安全化（VPC/SGs）。透過 `docker/` 卷持久化資料。

## 代理專用指令
- 進行任何變更時遵循這些指南。保持差異專注，尊重現有結構，避免不相關的重構。
