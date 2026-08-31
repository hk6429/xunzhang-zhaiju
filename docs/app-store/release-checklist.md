# iOS 發布檢查表

## 本機品質閘門

- [x] Web 測試、內容驗證與美術契約全部通過。
- [x] Worker typecheck、測試、migration smoke 與 dry-run 全部通過。
- [x] 版本庫機密掃描通過。
- [x] iPhone 單元／UI tests 通過。
- [x] iPad 13 吋 Simulator 完成直向、橫向與 accessibility 大字級自動 UI 測試（55 unit＋5 UI 全數通過）。
- [ ] iPad 真機完成直向、橫向、Split View、VoiceOver 與離線測試。
- [x] 未簽署 iPhoneOS Release Archive 已建立；版本 1.0.0（1）、iPhone＋iPad、正式同步 URL、加密宣告及 App／第三方共 12 份 `PrivacyInfo.xcprivacy` 全部驗證通過。

## 正式服務

- [x] Turso production database 已建立、migrations 已套用，PITR + 每週／重大 migration 前 SQL dump 的備份策略與驗證腳本已備妥。
- [x] Cloudflare Worker production／staging 分離，兩邊使用獨立 Turso DB、session secret 與 rate-limit namespaces，secrets 未寫入 Git。
- [x] Production CORS 只允許現有 Cloudflare Pages／Netlify 正式 Web origins，未使用萬用字元；陌生來源回傳 403。
- [ ] Apple／Google callback URL 與 client 設定完全一致。
- [ ] staging 完成登入、連結、同步衝突、refresh replay、限流、匯出與刪除 E2E。

## App Store Connect

- [ ] Bundle ID、版本、build number 與簽署正確。
- [ ] 正式簽署的 distribution archive 通過 App Store Connect 驗證且無 privacy manifest 警告。
- [ ] App 名稱、副標題、描述、關鍵字、分類、年齡分級與版權填妥。
- [x] 1024×1024 App Icon 為無 alpha PNG；封存後 iPhone／iPad 圖示尺寸與透明通道驗證通過。
- [x] 6.9 吋 iPhone 與 13 吋 iPad 首張無 alpha JPEG 截圖完成並通過尺寸驗證。
- [x] Support URL 與 Privacy Policy URL 已公開部署；公開支援表單可用，且明確提醒不得張貼個人資料。
- [ ] App Privacy 填答與實際資料流一致。
- [ ] TestFlight 測試資訊、聯絡信箱及審查說明齊全。
- [x] 核心 100 關採免登入訪客模式即可審查；登入只用於選配跨裝置同步。
- [x] 依目前 9 個鎖定套件重新確認加密出口合規；Release `Info.plist` 的 `ITSAppUsesNonExemptEncryption = false` 已由 Archive 閘門驗證。

## 放行標準

只有實際完成正式簽署、服務部署、三端 E2E、真機驗收與 TestFlight 上傳後，才能把專案狀態標示為「已上線測試」。目前程式完成不等於 TestFlight 已完成。
