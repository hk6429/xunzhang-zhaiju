# 進度同步 API v1

## 原則

- App 與 Web 永遠先寫本機；登入只增加雲端同步，不成為核心遊戲依賴。
- 伺服器只從已驗證的 session 取得 user ID，不接受 request body 指定使用者。
- `localPhrasePractice`、例句、姓名、email、頭像與 provider token 不得進入 snapshot／event。
- 同一裝置的 `sequence` 單調遞增；事件以 `id` 及 `(user, device, sequence)` 去重。
- 所有日期使用 ISO 8601；每日任務的 `dateKey` 使用台北時區 `YYYY-MM-DD`。

## 認證

### `POST /v1/auth/exchange`

```json
{ "provider": "apple", "idToken": "…", "nonce": "sha256-nonce" }
```

Worker 驗證 JWKS、issuer、audience、expiry 與 Apple nonce，再換發自有 session。Google 同樣只採用驗證後的 `sub`。

### `POST /v1/auth/refresh`

以一次性 refresh token 輪替 access token。伺服器只保存 token 雜湊；舊 token 重播時撤銷整個 token family。

## 同步

### `POST /v1/sync`

Header：`Authorization: Bearer <access-token>`

```json
{
  "deviceId": "裝置 UUID",
  "baseRevision": 3,
  "schemaVersion": 1,
  "snapshot": { "v": 1, "levels": {}, "ink": 3, "collection": [] },
  "events": []
}
```

回應包含新的 `revision`、合併後 `snapshot` 與 `acceptedEventIDs`。若 base revision 落後，伺服器依欄位規則合併：集合聯集、星數／累積值取 max、最佳時間與最少錯誤取 min、同日快陣先比得分再比時間、不同日每日資料取較新日期。

## 帳號資料

- `GET /v1/account/export`：匯出目前 snapshot 與事件（JSON）。
- `DELETE /v1/account`：需再次確認；刪除 identity、session、event、snapshot 與 user。

## 錯誤與限制

- Body 上限 1 MiB，單次最多 500 events。
- `400` 契約錯誤、`401` 憑證失效、`403` Origin 不允許、`409` revision 競爭、`413` 過大、`429` 頻率限制、`500` 未預期錯誤。
- 回應一律 `Cache-Control: no-store`；Web CORS 僅允許設定清單中的 HTTPS origin。
