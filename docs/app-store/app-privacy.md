# App Store Connect 隱私權填答草案

更新日期：2026-09-01

這份文件依目前程式實作整理；送審前仍須以正式部署的第三方服務設定與 Apple 當時問卷為準逐項複核。

## Tracking

- 是否用於追蹤：否。
- 是否使用資料做第三方廣告、開發者廣告或行銷：否。
- 是否販售資料：否。

## Data Linked to You

以下依目前 Release Archive 內 12 份 privacy manifests 的聚合結果填寫；所有資料類型均為 linked、not tracking。

| 來源 | Apple 資料類型 | 本專案／SDK 對應資料 | 用途 |
|---|---|---|---|
| 尋章摘句 | 使用者 ID | 由 `provider + subject` 衍生的內部帳號 ID | App Functionality |
| 尋章摘句 | 裝置 ID | App 安裝時產生的隨機 UUID | App Functionality |
| 尋章摘句 | 遊戲內容 | 關卡、星數、已找詞句、墨滴、每日任務、錯題與世界事件進度 | App Functionality |
| GoogleSignIn 9.2.0 | 姓名、電子郵件地址、電話號碼 | Google 帳號登入流程可能處理的聯絡資料 | App Functionality |
| GoogleSignIn 9.2.0 | 概略位置 | SDK 依 IP 推估的一般位置，用於登入安全與防詐 | App Functionality |
| GoogleSignIn 9.2.0 | 使用者 ID | OAuth 授權與 SDK 記錄 | App Functionality、Analytics |
| GoogleSignIn 9.2.0 | 裝置 ID | SDK 宣告的裝置識別資料 | Analytics |
| GoogleSignIn 9.2.0 | 其他資料類型 | SDK manifest 的保守型其他資料分類 | App Functionality、Analytics |
| GoogleSignIn 9.2.0 | 其他使用狀況資料 | SDK manifest 的使用狀況分類 | Analytics |

只有使用者登入並啟用同步時，尋章摘句自己的使用者 ID、裝置 ID 與遊戲內容才會傳到同步服務。GoogleSignIn 的 privacy manifest 為 SDK 作者提供的保守宣告，範圍大於本 App 實際讀取的欄位；送審填答仍採完整聚合結果，不以「程式沒有讀取」為由漏報。

## Not stored by the sync service

- 姓名、電子郵件、頭像、電話、地址、精確位置；Google 登入供應商可能在自己的登入流程中處理其中部分資料，但尋章摘句後端不保存。
- 廣告識別碼、聯絡人、相片、音訊、健康或付款資料。
- 個人例句／使用情境；此資料只存於裝置。
- 尋章摘句未整合獨立的分析、當機回報、廣告或推播 SDK；但 GoogleSignIn 自身的 manifest 對部分資料宣告 Analytics 用途，已列入上表。

登入供應商可能在自己的流程處理使用者帳號資料；尋章摘句後端只驗證身分權杖，不保存上述個人檔案欄位或原始權杖。

## Privacy manifest 對照

- `NSPrivacyTracking = false`
- 聚合 collected data：概略位置、裝置 ID、電子郵件地址、遊戲內容、姓名、其他資料類型、其他使用狀況資料、電話號碼、使用者 ID；全部 linked、not tracking。
- 聚合 Required-reason API：UserDefaults，理由 `1C8F.1`、`C56D.1`、`CA92.1`；來源包含 App 與 Google 登入相依套件。
- 契約檔：`docs/app-store/privacy-contract.json`；以 `tools/validate-app-privacy.mjs <archive>` 和實際封存檔比對。

## 送審前複核

- [x] 未加入獨立分析、當機回報、廣告或推播 SDK；GoogleSignIn manifest 的 Analytics 宣告已完整納入草案。
- [x] GoogleSignIn 與 GRDB 的套件版本及其 privacy manifest 已隨未簽署 Release Archive 正確打包。
- [ ] App Store Connect 填答與本文件、公開隱私權政策、`PrivacyInfo.xcprivacy` 一致。
- [x] 公開隱私權政策 URL 可在未登入狀態開啟，canonical 與 deployment-specific URL 均實測 HTTP 200。
- [ ] 若正式基礎設施會保存 IP／安全日誌，依 Apple 當時定義重新確認是否需增加資料類型。

## 判定依據

- [Apple：App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple：Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
- [GoogleSignIn-iOS：隨附 PrivacyInfo.xcprivacy](https://github.com/google/GoogleSignIn-iOS/blob/main/GoogleSignIn/Sources/Resources/PrivacyInfo.xcprivacy)
- [Google：Sign in with Google for iOS App Privacy](https://developers.google.com/identity/sign-in/ios/app-privacy)
