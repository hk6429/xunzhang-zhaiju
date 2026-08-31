# iOS 發布檢查表

## 本機品質閘門

- [x] Web 測試、內容驗證與美術契約全部通過。
- [x] Worker typecheck、測試、migration smoke 與 dry-run 全部通過。
- [x] 版本庫機密掃描通過。
- [x] iPhone 單元／UI tests 通過。
- [ ] iPad 真機完成直向、橫向、Split View、VoiceOver 與離線測試（Simulator 直向直接安裝啟動已通過）。
- [ ] Release Archive 內含有效 `PrivacyInfo.xcprivacy`，第三方套件 privacy manifests 無警告。

## 正式服務

- [ ] Turso production database 已建立、備份策略已確認、migrations 已套用。
- [ ] Cloudflare Worker production／staging 分離，secrets 未寫入 Git。
- [ ] CORS 只允許正式 Web origin。
- [ ] Apple／Google callback URL 與 client 設定完全一致。
- [ ] staging 完成登入、連結、同步衝突、refresh replay、限流、匯出與刪除 E2E。

## App Store Connect

- [ ] Bundle ID、版本、build number 與簽署正確。
- [ ] App 名稱、副標題、描述、關鍵字、分類、年齡分級與版權填妥。
- [ ] iPhone／iPad 截圖、App Icon、Support URL、Privacy Policy URL 齊全。
- [ ] 補齊 iPhone 6.9 吋主要截圖組；現有 6.3 吋與 iPad 13 吋原圖尺寸有效。
- [ ] App Privacy 填答與實際資料流一致。
- [ ] TestFlight 測試資訊、聯絡信箱及審查說明齊全。
- [ ] 測試帳號或免登入操作路徑可供審查使用。
- [ ] 再次確認加密出口合規判定，且 Release `Info.plist` 的 `ITSAppUsesNonExemptEncryption` 與答案一致。

## 放行標準

只有實際完成正式簽署、服務部署、三端 E2E、真機驗收與 TestFlight 上傳後，才能把專案狀態標示為「已上線測試」。目前程式完成不等於 TestFlight 已完成。
