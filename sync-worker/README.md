# 尋章摘句同步服務

Cloudflare Worker + Turso 的跨裝置進度同步 API。核心遊戲不依賴此服務；訪客可離線遊玩，登入後才啟用 Apple／Google 身分驗證與同步。

## API

- `GET /health`：服務健康狀態
- `POST /v1/auth/exchange`：驗證 Apple／Google ID token，換發 15 分鐘 access token 與一次性 refresh token
- `POST /v1/auth/refresh`：輪替 refresh token；重播舊 token 會撤銷整個 family
- `GET /v1/auth/web/start`：啟動瀏覽器 Apple／Google OAuth；Google 使用 authorization code + PKCE
- `GET|POST /v1/auth/web/callback`：驗證 OAuth state 與 nonce，交換代碼後寫入 HttpOnly session cookies
- `POST /v1/auth/web/refresh`：使用 HttpOnly refresh cookie 輪替瀏覽器 session
- `POST /v1/auth/logout`：撤銷目前 session family，並清除瀏覽器 cookies
- `POST /v1/account/link`：登入中再次驗證 Apple／Google，連結第二種登入方式；不依 email 自動合併
- `POST /v1/sync`：以 revision 合併快照，事件依 `id` 與「使用者／裝置／序號」去重；墨滴以事件差額結算，避免跨裝置花費後復活
- `GET /v1/account/export`：匯出帳號進度 JSON
- `DELETE /v1/account`：明確確認後刪除帳號及雲端資料

請求上限為 1 MiB。瀏覽器來源必須列在 `ALLOWED_ORIGINS`；iOS 原生請求沒有 `Origin` 標頭，不受 CORS 限制。
登入與同步分別使用 Cloudflare Rate Limiting binding；正式部署時 namespace ID 必須在同一帳號內保持唯一。

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

先建立 Turso 資料庫，再依檔名順序套用 `migrations/` 內所有 SQL。部署環境需設定：

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `WORKER_SESSION_SECRET`（至少 32 個字元的隨機值）

機密值用 `wrangler secret put` 設定，不寫入 `wrangler.jsonc`。執行任何 Turso 或 Cloudflare 登入操作前，先確認目前 CLI 登入狀態有效。

## OAuth 設定

在 `wrangler.jsonc` 填入逗號分隔的正式 client ID：

- `APPLE_CLIENT_IDS`：目前 iOS bundle ID 為 `tw.edu.hc.zgjh.xunzhangzhaiju`
- `GOOGLE_CLIENT_IDS`：Google OAuth 的 iOS／Web client ID
- `ALLOWED_ORIGINS`：正式網站來源，例如 `https://example.com`
- `PUBLIC_BASE_URL`：Worker 公開 HTTPS 網址，OAuth callback 會固定使用這個來源
- `APPLE_WEB_CLIENT_ID`、`APPLE_TEAM_ID`、`APPLE_KEY_ID`：Sign in with Apple 網頁服務識別資訊
- `GOOGLE_WEB_CLIENT_ID`：Google 網頁 OAuth client ID
- `WEB_COOKIE_SAME_SITE`：網站與 Worker 跨站時設為 `None`；同站自訂網域可設為 `Lax`

網頁 OAuth 另需以 secret 設定 `GOOGLE_WEB_CLIENT_SECRET` 與 `APPLE_PRIVATE_KEY`。Apple callback 依官方網頁流程使用 authorization code、state、nonce 與 ES256 client secret；Google 流程另使用 PKCE。兩者都不把供應商 token 存進瀏覽器儲存空間。

後端只信任經供應商公開金鑰驗證過的 `sub`，不以 email 或前端送來的使用者 ID 識別帳號。Apple 登入必須提供並驗證 nonce。

## 部署

```bash
npx wrangler whoami
npx wrangler secret put TURSO_DATABASE_URL
npx wrangler secret put TURSO_AUTH_TOKEN
npx wrangler secret put WORKER_SESSION_SECRET
npx wrangler secret put GOOGLE_WEB_CLIENT_SECRET
npx wrangler secret put APPLE_PRIVATE_KEY
npm run dry-run
npx wrangler deploy
```

正式部署前還要完成 Turso migration、Apple／Google OAuth client 設定及端對端真實 token 測試。
