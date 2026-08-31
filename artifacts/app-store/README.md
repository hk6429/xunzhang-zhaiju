# App Store 素材

## Simulator 原始截圖

| 檔案 | 尺寸 | 內容 | 用途 |
|---|---:|---|---|
| `screenshots/iphone-17-pro-max-home.jpg` | 1320 × 2868 | iPhone 17 Pro Max 修煉山河首頁 | 可上傳的 6.9 吋 JPEG，無 alpha channel |
| `screenshots/ipad-pro-13-home.jpg` | 2064 × 2752 | iPad Pro 13 吋修煉山河首頁 | 可上傳的 13 吋 JPEG，無 alpha channel |
| `screenshots/iphone-17-home.png` | 1206 × 2622 | iPhone 17 修煉山河首頁 | 6.3 吋 QA 原圖 |
| `screenshots/iphone-17-pro-max-home.png` | 1320 × 2868 | iPhone 17 Pro Max 修煉山河首頁 | 保留的 Simulator PNG 原圖 |
| `screenshots/ipad-pro-13-home.png` | 2064 × 2752 | iPad Pro 13 吋修煉山河首頁 | 保留的 Simulator PNG 原圖 |

這些檔案是未加文宣框的原始 App 截圖，可作為本機驗收證據與上架素材底稿。正式上傳前須依 App Store Connect 當下接受的顯示尺寸再次檢查，並補齊其他核心畫面與橫向／分割視窗素材。

上傳時使用 `.jpg` 版本；兩張都符合 Apple 對應尺寸且不含透明通道。Simulator 直接輸出的 `.png` 帶 alpha channel，因此只保留作為原始證據，不可直接上傳 App Store Connect。

截圖使用 Simulator 正常簽署 build。不可使用 `CODE_SIGNING_ALLOWED=NO` 的 App 做 Keychain 驗收，否則會產生 `OSStatus -34018`，那是簽署環境造成的假性失敗。

執行 `node tools/validate-app-store-assets.mjs` 可同時檢查截圖尺寸、alpha channel 與繁中 metadata 字數／bytes 上限。

## QA 證據

- `../qa/ipad-pro-13-ax5-home.png`：iPad Pro 13 吋使用系統最大 Dynamic Type（`accessibility-extra-extra-extra-large`）直接啟動的畫面。導覽與第一關入口仍可見，內容可透過捲動使用；測完後 Simulator 已恢復預設 `large` 字級。
