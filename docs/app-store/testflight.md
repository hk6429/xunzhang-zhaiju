# TestFlight 測試資料與驗收清單

更新日期：2026-09-01

## Beta App Description

尋章摘句是一款全原生 SwiftUI 中文尋詞解謎 App。玩家可在 100 關字格中找出成語、俗諺與古典名句，並透過線索、釋義、錯題複習、每日任務與圖鑑累積中文語感。核心內容可離線遊玩；Apple／Google 登入後可在 Web、iPhone 與 iPad 同步進度。

## What to Test

請協助測試：

1. 未登入時能否離線完成教學、關卡、每日任務與錯題複習。
2. full／cross 兩種盤面的選字操作、提示、倒數暫停與結算星等是否正確。
3. iPhone 與 iPad 旋轉、分割畫面、較大文字、VoiceOver 操作是否仍可完成核心流程。
4. Apple／Google 登入、登出、第二身分連結，以及 Web／iPhone／iPad 的進度與墨滴同步。
5. 網路中斷後繼續遊玩，恢復連線時是否安全同步且不重複扣除或增加墨滴。
6. 匯出雲端資料、刪除帳號，以及另外清除本機資料的確認流程。

## Beta App Review Information

- 登入需求：訪客模式不需帳號即可完整測試核心玩法。
- Apple／Google 同步：審查人員可使用自己的供應商帳號；正式 OAuth 設定完成後再填補必要說明。
- 聯絡信箱：**【上線前填入可公開且有人收信的測試聯絡信箱】**。
- 備註：個人例句只存在本機，不會同步；刪除雲端帳號不會自動清除本機資料，兩者皆需個別確認。

## 裝置與情境矩陣

| 平台 | 必測情境 | 目前證據 |
|---|---|---|
| iPhone | 啟動、五個分頁、關卡、動態文字 | 56 unit＋6 項適用 UI tests 通過 |
| iPad | 直向、橫向、Split View、鍵盤／觸控 | 56 unit＋7 UI tests 通過；Split View 與觸控真機待驗 |
| 離線 | 首次安裝後飛航模式、遊玩、重開 App | iPhone／iPad Simulator 已驗證終止程序、強制離線重開後 SQLite 進度仍在；真機飛航模式待驗 |
| 同步 | 首登合併、雙端衝突、墨滴事件去重 | 基礎服務已部署；單元／契約測試完成，正式 OAuth 三端 E2E 待驗 |
| 無障礙 | VoiceOver、最大文字、Reduce Motion | iPhone／iPad 已通過點擊區、描述、截斷與 traits 系統稽核；WCAG AA 色彩契約、最大字級與旋轉測試通過，真機 VoiceOver／Reduce Motion 待驗 |

## 送出 TestFlight 前硬閘門

- [ ] 加入 Apple Developer Program，建立 App ID、簽署與 App Store Connect App。
- [ ] 建立 Sign in with Apple 設定與 Google OAuth iOS／Web clients。
- [x] 建立 production／staging Turso 資料庫、套用 migrations，部署獨立 Cloudflare Workers 並設定 secrets／CORS。
- [x] 將正式 Worker HTTPS 網址寫入 Release build settings，並由 Archive 閘門驗證。
- [ ] 將 Apple／Google 正式 OAuth client IDs 寫入 Worker 與 Release build settings。
- [ ] 完成正式三端 E2E、帳號連結、權杖輪替、匯出與刪除驗收。
- [x] 公開部署 Support URL 與 Privacy Policy URL，並提供不要求電子郵件的 GitHub 支援表單。
- [ ] 填入 TestFlight Beta App Review 的有人收信聯絡信箱。
- [ ] 以 Xcode Archive 驗證簽署、privacy report、App Icon 與上傳前檢查。
- [ ] 上傳 build，填寫 Beta App Description、What to Test、Feedback Email 與 Review Information。
- [ ] 內部測試通過後，再視需要提交外部測試 Beta App Review。

TestFlight build 會有可測期限，且第一個提供外部測試的 build 可能需要 Apple 審查；實際欄位與流程以上傳當下的 App Store Connect 為準。
