# App Store Connect 隱私權填答草案

更新日期：2026-09-01

這份文件依目前程式實作整理；送審前仍須以正式部署的第三方服務設定與 Apple 當時問卷為準逐項複核。

## Tracking

- 是否用於追蹤：否。
- 是否使用資料做第三方廣告、開發者廣告或行銷：否。
- 是否販售資料：否。

## Data Linked to You

| Apple 資料類型 | 本專案對應資料 | 用途 | 是否追蹤 |
|---|---|---|---|
| User ID | 由 `provider + subject` 衍生的內部帳號 ID | App Functionality | 否 |
| Device ID | App 安裝時產生的隨機 UUID | 跨裝置事件去重、同步與安全 | 否 |
| Gameplay Content | 關卡、星數、已找詞句、墨滴、每日任務、錯題、世界事件等進度 | App Functionality | 否 |

只有使用者登入並啟用同步時，以上資料才會傳到尋章摘句同步服務。由於伺服器可將它們與帳號 ID 關聯，保守填為「Data Linked to You」。

## Not Collected by the sync service

- 姓名、電子郵件、頭像、電話、地址、精確位置。
- 廣告識別碼、聯絡人、相片、音訊、健康或付款資料。
- 個人例句／使用情境；此資料只存於裝置。
- 診斷與分析資料；目前未整合分析或當機回報 SDK。

登入供應商可能在自己的流程處理使用者帳號資料，但尋章摘句後端只驗證身分權杖，不保存上述個人檔案欄位或原始權杖。

## Privacy manifest 對照

- `NSPrivacyTracking = false`
- Collected data：User ID、Device ID、Gameplay Content；全部 linked、not tracking、App Functionality。
- Required-reason API：UserDefaults，理由 `CA92.1`，僅供 App 自身偏好設定使用。

## 送審前複核

- [ ] 正式版未新增分析、當機回報、廣告或推播 SDK。
- [ ] GoogleSignIn 與 GRDB 的套件版本及其 privacy manifest 已隨封存檔正確打包。
- [ ] App Store Connect 填答與本文件、公開隱私權政策、`PrivacyInfo.xcprivacy` 一致。
- [ ] 公開隱私權政策 URL 可在未登入狀態開啟。
- [ ] 若正式基礎設施會保存 IP／安全日誌，依 Apple 當時定義重新確認是否需增加資料類型。
