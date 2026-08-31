# 尋章摘句同步服務

Cloudflare Worker + Turso 的跨裝置進度同步 API。核心遊戲不依賴此服務；訪客可離線遊玩，登入後才啟用 Apple／Google 身分驗證與同步。

## API

- `GET /health`：服務健康狀態
- `POST /v1/auth/exchange`：驗證 Apple／Google ID token，換發 30 天短期 session
- `POST /v1/sync`：以 revision 合併快照，事件依 `id` 與「使用者／裝置／序號」去重

請求上限為 1 MiB。瀏覽器來源必須列在 `ALLOWED_ORIGINS`；iOS 原生請求沒有 `Origin` 標頭，不受 CORS 限制。

## 本機驗證

需使用 Node.js 20 以上。複製 `.dev.vars.example` 為 `.dev.vars`，只填本機測試值，不可提交真實密鑰。

```bash
npm install
npm run types
npm run typecheck
npm test
npm run dry-run
```

## Turso 初始化

先建立 Turso 資料庫，再用 Turso CLI 套用 `migrations/0001_initial.sql`。部署環境需設定：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `WORKER_SESSION_SECRET`（至少 32 個字元的隨機值）

機密值用 `wrangler secret put` 設定，不寫入 `wrangler.jsonc`。執行任何 Turso 或 Cloudflare 登入操作前，先確認目前 CLI 登入狀態有效。

## OAuth 設定

在 `wrangler.jsonc` 填入逗號分隔的正式 client ID：

- `APPLE_CLIENT_IDS`：目前 iOS bundle ID 為 `tw.edu.hc.zgjh.xunzhangzhaiju`
- `GOOGLE_CLIENT_IDS`：Google OAuth 的 iOS／Web client ID
- `ALLOWED_ORIGINS`：正式網站來源，例如 `https://example.com`

後端只信任經供應商公開金鑰驗證過的 `sub`，不以 email 或前端送來的使用者 ID 識別帳號。Apple 登入必須提供並驗證 nonce。

## 部署

```bash
npx wrangler whoami
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put WORKER_SESSION_SECRET
npm run dry-run
npx wrangler deploy
```

正式部署前還要完成 Turso migration、Apple／Google OAuth client 設定及端對端真實 token 測試。
