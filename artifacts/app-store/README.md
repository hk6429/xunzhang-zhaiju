# App Store 素材

## Simulator 原始截圖

| 檔案 | 尺寸 | 內容 | 驗證用途 |
|---|---:|---|---|
| `screenshots/iphone-17-home.png` | 1206 × 2622 | iPhone 修煉山河首頁 | 正常簽署 Simulator build、Keychain 初始化與原生 UI 啟動 |
| `screenshots/ipad-pro-13-home.png` | 2064 × 2752 | iPad Pro 13 吋修煉山河首頁 | iPad 直向啟動、NavigationSplitView 與多欄關卡排版 |

這些檔案是未加文宣框的原始 App 截圖，可作為本機驗收證據與上架素材底稿。正式上傳前須依 App Store Connect 當下接受的顯示尺寸再次檢查，並補齊其他核心畫面與橫向／分割視窗素材。

截圖使用 Simulator 正常簽署 build。不可使用 `CODE_SIGNING_ALLOWED=NO` 的 App 做 Keychain 驗收，否則會產生 `OSStatus -34018`，那是簽署環境造成的假性失敗。

## QA 證據

- `../qa/ipad-pro-13-ax5-home.png`：iPad Pro 13 吋使用系統最大 Dynamic Type（`accessibility-extra-extra-extra-large`）直接啟動的畫面。導覽與第一關入口仍可見，內容可透過捲動使用；測完後 Simulator 已恢復預設 `large` 字級。
