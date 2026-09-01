# 尋章摘句

[![Quality](https://github.com/hk6429/xunzhang-zhaiju/actions/workflows/quality.yml/badge.svg)](https://github.com/hk6429/xunzhang-zhaiju/actions/workflows/quality.yml)

中文「尋詞解謎」練功 App：在字格中找出隱藏的成語、諺語、俗語與古典文學名句。專案同時保留原始 Web 版，並以 SwiftUI 全原生重寫 iPhone／iPad 版。

[立即遊玩 Web 版](https://xunzhang-zhaiju.pages.dev)（Netlify 備援鏡像：`https://xunzhang-zhaiju.netlify.app`）｜[隱私權政策](https://xunzhang-zhaiju.pages.dev/privacy.html)｜[使用支援](https://xunzhang-zhaiju.pages.dev/support.html)

## 原生 App

- SwiftUI，最低 iOS／iPadOS 16，支援 iPhone 與 iPad。
- 409 條語料、100 關、10 章完整收錄於 App bundle，核心玩法可完全離線使用。
- 具備三種模式、倒數與提示、每日任務、快陣、錯題複習、圖鑑、五件故事法寶、十章被動法寶、世界事件、隱藏真結局及休息提醒。
- 訪客可直接遊玩；Apple／Google 登入後，透過 Cloudflare Worker + Turso 同步 Web、iPhone、iPad 進度。
- 個人例句只保存在裝置上，不加入同步 outbox。

iOS 開發與測試方式見 [`ios/README.md`](ios/README.md)，同步服務見 [`sync-worker/README.md`](sync-worker/README.md)，正式／staging 部署證據見 [`docs/deployment/production.md`](docs/deployment/production.md)。上架前資料集中於 [`docs/app-store/`](docs/app-store/)（商店文案、年齡分級、隱私、加密合規、TestFlight 與發布檢查表）。

每次推送與 pull request 都會執行 GitHub Actions `Quality`：驗證 Web 內容與 117 項契約、Worker 26 項測試／typecheck／dry-run、97 項 Swift 單元測試、iPhone／iPad UI、App Store 素材，以及未簽署 Release Archive 的版本、圖示、隱私清單與 Debug 開關隔離。

## 玩法

- **線索猜句**：目標不直接顯示，改以創意線索呈現（釋義猜謎／腦筋急轉彎／典故情節／諧音梗／生活情境），找到才翻面。
- **兩種盤面**：`full` 滿盤尋句（拖選橫/直）與 `cross` 填字十字（點格輸入整句，交叉格預先顯字）。
- **墨水經濟**：提示要花墨水，墨水只能靠答對學習題賺（釋義選句 +1／挖空填字 +2）。提示三層價：圈首字 1／閃現整句 3／直接揭示 5（揭示則該關 1★、不入圖鑑）。
- **v3 挑戰變數**：第二章起有倒數計時（超時「時辰已到」須重來；開視窗時暫停）與每關提示次數上限。
- **星等**：零提示 3★／用提示 2★／用揭示 1★。進度存 localStorage，可匯出進度碼。
- **山河分支地圖**：100 關分成 10 章，含主線、典故支線、法寶支線、非戰鬥事件與五場三階段 Boss。
- **留存循環**：支援重修最佳成績、三種模式、每日任務、一炷香快陣、錯題間隔複習、法寶碎片、續玩與休息提醒。
- **學習者主導**：封神寶典可寫自己的例句或使用情境，多元學習身分不做單一排名；班級協作僅交換匿名彙總成果。
- **即時在線**：右下角顯示 Cloudflare／Netlify 兩站共用的在線人數；每個分頁只產生匿名隨機識別碼，75 秒未回報即自動離線。

## 內容

- 語料 409 條：成語、諺語／俗語與漢賦、古詩、樂府、唐詩、宋詞、元曲、章回小說選句；每條含 3 則線索、白話釋義與延伸體會。
- 關卡 100 關、10 章：前 50 關為封神山河分支，後 50 關為「文林淬鍊卷」，預生成於 `data/levels.json`。
- 語料釋義與生活用法由本站自行撰寫，前端不顯示外部辭典出處。

## 開發

```bash
python3 -m http.server 8642   # 本機試玩 http://localhost:8642
node tools/generate-levels.mjs data/phrases.json data/levels.json [seed]  # 重產關卡（確定性）
node tools/validate.mjs data/phrases.json data/levels.json                # 硬閘門驗證
node tools/validate-visuals.mjs                                          # 美術資產契約驗證
node tools/validate-app-store-assets.mjs                                 # App Icon、截圖、metadata 與公開頁面入口
node tools/scan-secrets.mjs                                              # 版本庫機密掃描（不輸出疑似密鑰內容）
tools/backup-turso.sh xunzhang-zhaiju                                    # 建立並驗證版本庫外的 Turso SQL 備份
tools/validate-ios-archive.sh /path/to/XunZhangZhaiJu.xcarchive           # 驗證封存版本、圖示、隱私聚合與 SDK pins
node tools/validate-app-privacy.mjs /path/to/XunZhangZhaiJu.xcarchive     # 單獨重跑 Archive 隱私契約
tools/deploy-pages.sh                                                    # 從乾淨 commit 部署 Web 正式站
node --test tests/*.test.js                                                # Web 模組不變式測試
npx wrangler deploy --config presence-worker/wrangler.jsonc              # 部署匿名在線 Presence API
cd sync-worker && npm run typecheck && npm test && npm run dry-run       # 驗證進度同步 Worker
```

美術資產驗證會檢查 `index.html` 與各 registry 的 SVG／PNG／JPG 圖片參照是否存在、九位 Q 版角色是否具備 16:10 滿版國風水墨 metadata，以及首頁、五章密室與通關慶典等七個主要場景是否齊全。

介面契約凍結於 `docs/SCHEMA.md`。
