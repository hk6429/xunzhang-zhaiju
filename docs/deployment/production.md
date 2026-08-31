# 正式環境部署紀錄

更新日期：2026-09-01

## 已建立

- Cloudflare Worker：`xunzhang-zhaiju-sync`
- 公開 API：`https://xunzhang-zhaiju-sync.hk6429.workers.dev`
- Turso database：`xunzhang-zhaiju`（default group）
- Staging Worker：`xunzhang-zhaiju-sync-staging`
- Staging API：`https://xunzhang-zhaiju-sync-staging.hk6429.workers.dev`
- Staging Turso database：`xunzhang-zhaiju-staging`（default group）
- Turso migrations：`0001_initial.sql`、`0002_ink_ledger.sql`
- Worker secrets：`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`WORKER_SESSION_SECRET`
- Cloudflare Pages 正式站：`https://xunzhang-zhaiju.pages.dev`
- App Store Support URL：`https://xunzhang-zhaiju.pages.dev/support.html`
- App Store Privacy Policy URL：`https://xunzhang-zhaiju.pages.dev/privacy.html`
- Staging 使用獨立的 Worker／Turso database／session secret／rate-limit namespaces，設定檔為 `sync-worker/wrangler.staging.jsonc`。
- Production CORS allowlist 僅含現有正式鏡像：`https://xunzhang-zhaiju.pages.dev`、`https://xunzhang-zhaiju.netlify.app`；staging 尚無公開前端，因此維持空 allowlist。

資料庫的實際 URL、權杖與 session secret 不寫入版本庫。Migration 後已確認七個 table／index 物件存在、`progress_events.ink_delta` 欄位存在，且 `PRAGMA foreign_key_check` 無結果。

## 備份與復原

採雙層策略：

1. Turso 的 [Point-in-Time Recovery（PITR）](https://docs.turso.tech/features/point-in-time-recovery)作為誤刪或錯誤 migration 後的快速復原。復原時建立新資料庫，不直接覆寫原資料庫；驗證新資料庫後才切換 Worker secret。
2. 每週執行一次[可攜式 SQL dump](https://docs.turso.tech/cli/db/shell)，重大 migration 前再額外執行一次。備份放在版本庫外、權限為僅擁有者可讀寫，並另外複製到受控的異地儲存空間。

建立並驗證 dump：

```sh
tools/backup-turso.sh xunzhang-zhaiju
tools/backup-turso.sh xunzhang-zhaiju-staging
```

預設輸出到專案同層的 `xunzhang-zhaiju-backups/`；也可把第二個參數指定為加密備份目錄。腳本會先確認 Turso 登入、套用 dump 至記憶體 SQLite 並執行 `PRAGMA integrity_check`，最後輸出 SHA-256；不會輸出資料庫權杖。

2026-09-01 已分別對 production 與 staging 實際建立基準 dump，兩份皆通過完整性檢查，檔案權限為 `600`。

PITR 復原流程：

```sh
turso db create <new-database> --from-db xunzhang-zhaiju --timestamp <RFC3339-time>
```

復原後先檢查 schema、`PRAGMA foreign_key_check` 與關鍵資料筆數，再建立新 token、更新 Worker 的 `TURSO_DATABASE_URL`／`TURSO_AUTH_TOKEN`，通過 E2E 後才處理舊資料庫。PITR 保留時間取決於 Turso 方案，不能取代異地 dump。

## 仍停用

Apple／Google 登入仍停用，直到帳號持有人提供並完成：

- Apple Developer Program、App ID、Services ID、Team ID、Key ID 與 Sign in with Apple private key。
- Google Cloud iOS／Web OAuth clients 與 Web client secret。
- 將 Web 版的 `xzzj-sync-api` 指向正式 Worker；目前刻意保留空值，在 OAuth 完成前不顯示可用的登入／同步操作。

不得以測試 client ID、假 private key 或寬鬆 `*` CORS 代替正式設定。

## 上線驗證

- Production 與 staging 的 `GET /health` 均已實測回傳 HTTP 200、`Cache-Control: no-store` 與版本 1。
- Production 已從兩個 allowlist origins 實測 HTTP 200、精確 `Access-Control-Allow-Origin` 與 credentials；未列入的測試來源回傳 403。
- Support 與 Privacy Policy 頁面已由 commit `e979940` 部署；canonical 與 deployment-specific URL 均實測 HTTP 200、頁面標題與內容正確，GitHub 支援表單也回傳 HTTP 200。
- `tools/deploy-pages.sh` 只會從乾淨 commit 複製 Web 必要檔案到暫存目錄，通過素材與機密掃描並確認 Cloudflare 登入後才部署，避免把 iOS、文件或 `node_modules` 上傳。
- 未完成 OAuth 設定前，登入端點不可被列為可用功能。
- OAuth 完成後，依 `docs/app-store/release-checklist.md` 執行真實 token、三端同步、匯出與刪除 E2E。
