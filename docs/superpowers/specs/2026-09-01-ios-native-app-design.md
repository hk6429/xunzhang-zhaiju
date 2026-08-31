# 尋章摘句 iOS／iPadOS 原生 App 設計規格

- 日期：2026-09-01
- 狀態：設計已於對話中核可，等待書面規格審閱
- 目標平台：iOS 16、iPadOS 16 以上
- 第一個外部交付：TestFlight 完整功能測試版

## 1. 產品目標

以 SwiftUI 全原生重寫《尋章摘句》，完整保留現有網頁版的 100 關、封神山河世界、文林淬鍊卷、學習機制與留存系統，同時針對 iPhone、iPad 提供原生手勢、中文鍵盤、觸覺回饋、無障礙與離線體驗。

App 免登入即可完整離線遊玩。使用者以 Apple 或 Google 登入後，iPhone、iPad 與現有網頁版可透過 Cloudflare Worker 與 Turso 同步進度。

## 2. 已確認的產品決策

1. 第一階段以 TestFlight 測試為目標，成熟後保留正式上架 App Store 的路徑。
2. 第一個 TestFlight 版本包含完整 100 關，不以 10 關展示版取代完整交付。
3. 同時支援 iPhone 與 iPad，最低版本為 iOS 16／iPadOS 16。
4. 使用 SwiftUI 全原生重寫，不以 Capacitor 或 WKWebView 封裝網站。
5. 核心內容完整離線可玩；即時在線與跨平台同步才需要網路。
6. 免登入即可玩；Apple／Google 登入只用來啟用跨平台同步。
7. 資料庫使用 Turso；不用 Supabase、Firebase Authentication 或 Clerk。
8. 身分驗證由 Cloudflare Worker 自建，使用 Apple／Google 官方身分權杖。
9. 第一版不做班級、排行榜或教師後台。
10. 全年齡可用，完全免費、無廣告、無內購、無第三方行為分析。
11. 尚未加入 Apple Developer Program；不阻塞本機開發，但送 TestFlight 前必須完成申請。

## 3. 非目標

- 不重寫或下架現有網頁版。
- 不建立聊天、社群貼文、公開個人檔案或好友系統。
- 不蒐集真實姓名、生日、性別、電話、位置、相片或學校班級。
- 不將自由例句、使用情境或其他自由輸入文字上傳雲端。
- 不在第一版加入推播通知、付費功能、廣告或跨使用者競賽。
- 不讓 iOS App 直接持有 Turso 資料庫權杖。

## 4. Repository 與模組架構

維持單一 repository，讓網頁、iOS 與後端共享資料契約：

```text
xunzhang-zhaiju/
├── data/                         # phrases、levels、events 等共用資料
├── assets/                       # 網頁與 App 的原始美術來源
├── index.html / js/ / css/       # 現有網頁版
├── ios/
│   └── XunZhangZhaiJu/
│       ├── App/                  # App 入口、依賴組裝、ScenePhase
│       ├── Domain/               # Codable 模型與跨模組協定
│       ├── Content/              # Bundle 載入、schema 驗證
│       ├── GameEngine/           # 純 Swift 遊戲規則與狀態機
│       ├── Features/             # Map、Game、Daily、Collection、Profile
│       ├── Persistence/          # GRDB／SQLite、migration、outbox
│       ├── Sync/                 # push、pull、合併、重試
│       ├── Auth/                 # Apple、Google、Keychain session
│       ├── DesignSystem/         # 國風色彩、字體、元件與動效
│       └── Resources/            # App 內 JSON、圖片、音效與 Asset Catalog
├── sync-worker/                  # Cloudflare Worker API
└── docs/contracts/               # 版本化進度與 API 契約
```

### 4.1 依賴方向

```text
SwiftUI Features → Domain ← GameEngine
       │             ↑          ↑
       ├→ Persistence┘          │
       ├→ Sync ─────────────────┘
       └→ Auth
```

- `Domain` 不依賴 SwiftUI、SQLite、網路或身分 SDK。
- `GameEngine` 只接收 Domain 模型與明確指令，輸出狀態與事件。
- `Features` 不直接執行 SQL，也不自行修改墨水、星等或收藏。
- `Persistence`、`Sync`、`Auth` 透過協定注入，測試可換成記憶體實作。

### 4.2 共用資料建置

- `data/phrases.json`、`data/levels.json` 及必要世界資料是單一事實來源。
- 新增 `data/app-content-manifest.json` 保存 `schemaVersion`、各資料檔雜湊與預期筆數；不改變現有 `phrases.json` 陣列及 `levels.json` 物件的外形。
- Xcode 建置前先執行既有內容驗證器，再將核可資料複製進 App Bundle。
- App 啟動時依 manifest 驗證 `schemaVersion`、檔案雜湊、關卡數、語料引用與方向枚舉；驗證失敗顯示可診斷錯誤畫面，不進入損壞關卡。
- App Bundle 內容唯讀。使用者進度另存本機 SQLite，不修改內建 JSON。

## 5. 原生導航與畫面

### 5.1 iPhone

底部四分頁：

1. `修煉山河`：續玩、前 50 關封神山河分支、後 50 關文林淬鍊卷。
2. `今日修煉`：今日三帖、一炷香快陣、錯題間隔複習。
3. `摘句集`：收藏、知識卡、類型／朝代篩選、本機自由例句。
4. `我的`：功名、法寶、遊玩模式、無障礙、登入、同步與資料管理。

進入關卡後使用沉浸式全畫面，保留返回地圖、關卡目標、倒數、提示、墨水、守護仙人與學習目標。

### 5.2 iPad

- 使用 `NavigationSplitView`：左側功能導覽，右側顯示地圖、圖鑑或遊戲內容。
- 地圖與圖鑑可使用較寬資訊欄；關卡盤面置中並保留足夠線索區。
- 支援直向與橫向。旋轉裝置不得重置當前關卡、計時或輸入內容。

### 5.3 地圖與美術

- 前 50 關保留單幅封神山河分支地圖與事件節點，不改成一般關卡清單。
- 後 50 關保留文林淬鍊卷的章節卡與進度表現。
- 重用現有約 5.1 MB 美術資產，包括 `chamber-map-v2.webp`、角色、法寶與密室場景；Xcode 端匯入 Asset Catalog，避免執行期讀取網頁 registry。
- App Icon 由既有品牌視覺輸出 Apple 要求的點陣尺寸；不使用執行期 SVG 當 App Icon。

## 6. 盤面與輸入設計

### 6.1 Full 尋句盤面

- 使用原生格子視圖承載可存取的每一格文字，另以 `Canvas` 或 overlay 繪製拖曳路徑與完成連線。
- 單指拖曳：選取合法方向的連續字格。
- 雙指縮放／平移：服務 13×13 至 20×20 盤面，與單指選句分流，避免手勢互搶。
- 方向、邊界與目標比對由 `GameEngine` 處理，View 只回報起點、終點與路徑。

### 6.2 Cross 填字盤面

- 空白格不顯示；交叉格依資料預先揭露。
- 點格子或線索 chip 選擇目標詞，再以原生 `TextField` 與中文鍵盤輸入完整答案。
- `FocusState` 管理鍵盤焦點；鍵盤出現時線索與輸入框必須保持可見。
- 正確答案填入全部路徑並連動交叉格；錯誤只提供短暫視覺與觸覺回饋，不洩漏答案。

### 6.3 無障礙替代操作

- VoiceOver 逐格讀出列、欄與字元。
- 除拖曳外，提供「點起點、再點終點」模式完成選句。
- 所有只靠顏色表達的狀態同時提供圖形、文字或音效線索。
- 支援 Dynamic Type、高對比、Reduce Motion；放大文字不得遮蔽關鍵按鈕。

## 7. GameEngine

### 7.1 模型

核心模型至少包含：

- `Phrase`、`Clue`、`LiteraryMetadata`
- `Level`、`Target`、`GridCoordinate`、`Direction`、`Layout`
- `PlayMode`、`GameRun`、`GameState`
- `HintTier`、`InkTransaction`
- `LevelResult`、`BestRun`、`CollectionEntry`
- `RetentionState`、`DailyPlan`、`WorldState`、`TreasureState`

### 7.2 狀態機

```text
preparing → running ⇄ paused
                 ⇄ presentingKnowledge
                 ⇄ presentingQuiz
                 → completed
                 → timedOut
```

- 所有教育性彈窗、系統中斷與 App 進入背景時暫停倒數。
- 回到前景時以單調時鐘差重新計算，不以畫面 timer tick 當真實時間。
- 旋轉裝置或切換 iPad 分割畫面不重建 `GameRun`。

### 7.3 功能對等範圍

原生版本必須支援目前網頁版的：

- 100 關與 10 章課程表。
- `full`、`cross` 兩種版型。
- 探索、標準、挑戰三種模式。
- 三級提示、墨水經濟、提示上限與直接揭示的星等限制。
- 計時、超時重來、知識卡、研墨題、星等與最佳成績。
- 每日三帖、一炷香快陣、連續紀錄與補簽規則。
- 錯題間隔複習、法寶碎片／被動、世界事件、功名進度與隱藏結局。
- 圖鑑收藏、續玩、未完成關卡與休息提醒。
- 本機自由例句／使用情境；自由文字不進雲端同步。

## 8. 本機儲存

### 8.1 技術

- 使用 GRDB.swift 經 Swift Package Manager 操作系統 SQLite，支援 iOS 16。
- 所有 schema 變更使用具名稱、可重跑測試的 migration。
- 寫入遊戲結果、進度事件與 outbox 必須在同一 transaction 完成。

### 8.2 資料

本機至少保存：

- `progress_snapshot`
- `progress_events`
- `sync_outbox`
- `local_phrase_practice`
- `app_settings`
- `migration_log`

安裝識別使用 App 自行產生的隨機 UUID，存入 Keychain；不讀取 IDFA、裝置序號或其他跨 App 識別碼。

## 9. 離線同步與衝突處理

### 9.1 事件與快照

- 每個有效進度變化產生不可重複的 `eventId`、`deviceId`、`eventType`、嚴格驗證的 payload 與客戶端時間。
- Worker 接收後指定遞增 `serverSequence`；相同 `eventId` 重送只計算一次。
- Server 定期將事件壓縮成版本化 snapshot；尚未被所有必要流程吸收的事件不得提前刪除。
- 遊戲 UI 永遠先讀本機 snapshot；push／pull 在背景進行，不阻塞操作。

### 9.2 合併規則

| 資料 | 規則 |
|---|---|
| 已完成關卡 | 聯集 |
| 每關星等 | 取最高 |
| 每關 found、badge、模式 | 聯集 |
| 最佳時間 | 合法完成紀錄取最短 |
| 最少錯誤 | 合法完成紀錄取最少 |
| 圖鑑、法寶、世界事件、章節 | 聯集 |
| 墨水 | 對去重後 earned／spent 事件重算，最低為 0 |
| 題目統計 | 對去重事件加總，不上傳答案文字 |
| 每日任務／連續紀錄 | 依 Asia/Taipei 日期與伺服器時間重算 |
| 偏好設定 | 各欄位最後更新者優先 |
| 自由例句 | 僅本機，不合併 |

若兩台離線裝置同時花費墨水而造成合併後不足，墨水歸零，但不撤銷已使用提示、已學內容或破關結果。這是教育遊戲的防挫敗決策，不把防作弊置於學習成果之上。

### 9.3 訪客升級

- 訪客事件保留本機 `deviceId` 與事件 UUID。
- 首次登入後，App 將訪客事件認領到會員帳號，再與雲端事件合併。
- 雲端舊進度與本機訪客進度皆保留，不採整包覆蓋。
- 登出不刪本機已同步進度；下一位登入者不得看到前一帳號的雲端個人狀態。登出後建立新的訪客空間，原帳號快取以帳號命名空間隔離。

## 10. 身分驗證與 session

### 10.1 iOS

- Apple：`AuthenticationServices`＋每次登入產生的 nonce。
- Google：Google Sign-In iOS SDK。
- App 將 provider ID token、原始 nonce 與 App audience 送至 Worker，絕不將 Turso token 放進 App。

### 10.2 網頁

- Worker 實作 Authorization Code＋PKCE、state 與 nonce。
- callback 成功後設定 Secure、HttpOnly、SameSite session cookie；登入頁不在 localStorage 保存 provider token。
- Apple Web 登入所需 private key 與 client secret 只放 Worker Secrets，並在到期前輪替；金鑰輪替是上線維運清單的固定項目。

### 10.3 Worker 驗證

- 使用經維護的 JOSE 函式庫與 Apple／Google JWKS。
- 必驗簽章、issuer、audience、expiry、nonce／state；JWKS 依 HTTP cache 規則快取與輪替。
- 以 `provider + subject` 經伺服器 HMAC 後存成不可逆 identity key。
- 不保存 provider access token、姓名、電子郵件或頭像。

### 10.4 自有 session

- access token 為短效簽章 JWT；refresh token 為至少 256-bit 隨機不透明值。
- Turso 只保存 refresh token 的雜湊；refresh token 每次使用即輪替。
- 重播已輪替 refresh token 時撤銷同一 session family。
- iOS token 存 Keychain；登出時撤銷伺服器 session 並清除 Keychain。

### 10.5 帳號連結與刪除

- Apple、Google 不依電子郵件自動合併，尤其不可把 Apple 私密轉寄地址當合併依據。
- 連結第二個登入方式前，使用者必須已有有效 session，並重新驗證兩個 provider。
- App 內提供「刪除帳號」。刪除流程撤銷 refresh session、刪除 Turso 的 identity、event、snapshot 與 user，並依 provider 要求處理授權撤銷。
- 刪除雲端帳號不偷偷刪除未確認的本機訪客資料；介面分開詢問是否同時清除本機進度。

## 11. Worker API 與 Turso

### 11.1 API

```text
POST /v1/auth/exchange
POST /v1/auth/refresh
POST /v1/auth/logout
POST /v1/auth/link
POST /v1/sync/push
GET  /v1/sync/pull?after=<serverSequence>
GET  /v1/account/export
DELETE /v1/account
```

- 所有 mutation 接受 `Idempotency-Key` 或事件 UUID。
- JSON body 有明確大小上限與 schema 驗證。
- CORS 僅允許正式網站來源；原生 App 走 bearer session。
- 登入、refresh、push 與 delete 有按 IP、帳號及 session 的 rate limit。
- 錯誤回應使用版本化錯誤碼，不回傳 provider token、資料庫 SQL 或內部堆疊。

### 11.2 Turso 表

```text
users(id, created_at)
auth_identities(provider, subject_hmac, user_id, created_at)
refresh_sessions(id, user_id, family_id, token_hash, expires_at, revoked_at)
progress_events(user_id, event_id, device_id, event_type, payload_json,
                client_at, server_sequence, created_at)
progress_snapshots(user_id, schema_version, state_json, server_sequence, updated_at)
```

- `(user_id, event_id)` 唯一，確保同步冪等。
- `subject_hmac` 唯一，且不保存原始 provider subject。
- 所有查詢以已驗證 `user_id` 限定；客戶端不得傳任意目標 user ID 決定存取範圍。
- Turso URL 與權杖只存在 Cloudflare Worker Secrets。

## 12. 錯誤處理

| 情境 | 使用者體驗 | 系統行為 |
|---|---|---|
| 無網路／Worker 故障 | 顯示非阻斷「尚未同步」 | 保留 outbox，稍後重試 |
| access token 過期 | 優先無感更新 | refresh 成功後重送一次原請求 |
| refresh 失敗 | 回到訪客狀態，不刪本機進度 | 撤銷本機 session，停止會員 push |
| schema 太新 | 提示更新 App | 停止雲端 mutation，保留本機事件 |
| 內建內容損壞 | 顯示診斷與重新安裝提示 | 不進入關卡，不寫錯誤進度 |
| SQLite migration 失敗 | 顯示可復原錯誤 | 保留原檔診斷副本，不覆寫 |
| 同步事件被拒 | 顯示同步需處理 | 隔離該事件，其餘合法事件繼續 |

背景同步是最佳努力，不依賴 iOS 保證特定時間執行。必要同步點為登入成功、App 回到前景、關卡完成、使用者手動重新整理；進入背景時只嘗試短時間 flush，不把成功當成離開 App 的前提。

## 13. 隱私與全年齡設計

- 不加入廣告 SDK、第三方分析 SDK、追蹤像素或跨 App 識別碼。
- 雲端只保存不可逆身分映射、進度事件、快照與 session 安全資料。
- 自由文字只在本機；同步 payload schema 不提供自由文字欄位。
- App 首次登入前清楚說明同步資料範圍，並提供隱私權政策連結。
- App 內提供資料匯出、登出、刪除雲端帳號及另行清除本機進度。
- App Store 分類以「教育」為主；除非日後明確改成主要面向兒童且完成 Kids Category 額外要求，不使用「For Kids／兒童專用」行銷文字。

## 14. 測試策略

### 14.1 共用契約與內容

- 保留既有 Node 驗證器與測試。
- 建立固定 golden fixtures，讓 JavaScript 與 Swift 分別計算相同關卡路徑、提示結果、星等、每日 seed、進度正規化與衝突合併，輸出必須一致。
- Swift 測試載入 manifest、全部 409 筆語料與 100 關，驗證檔案雜湊、所有引用、路徑、cross 交叉、尺寸、計時、提示上限與 schemaVersion。

### 14.2 iOS 單元與整合測試

- `GameEngine`：full／cross、提示、揭示、倒數暫停、超時、三星規則、續玩。
- `Persistence`：全新安裝、每一版 migration、transaction rollback、損壞資料處理。
- `Sync`：重送、亂序、重複、離線雙裝置衝突、訪客認領、帳號隔離。
- `Auth`：nonce、Keychain、session 輪替、登出與刪除。

### 14.3 UI 測試矩陣

- 小螢幕 iPhone、一般 iPhone、大螢幕 iPhone。
- iPad 直向、橫向與分割畫面。
- iOS／iPadOS 16 最低版本與當前最新版。
- 中文注音鍵盤、Dynamic Type 最大可用級別、高對比、Reduce Motion。
- 20×20 盤面的縮放、平移、單指選句與 VoiceOver 替代選句。
- 登入、訪客升級、離線破關、恢復網路與跨裝置拉取。

### 14.4 Worker 資安測試

- 偽造簽章、錯誤 issuer／audience、過期 token、錯誤 nonce／state。
- 已輪替 refresh token 重播、撤銷 session、rate limit。
- 嘗試讀寫其他使用者資料、篡改 user ID、重複 eventId。
- 超大 payload、未知 eventType、自由文字注入、SQL injection。
- 帳號刪除後無法再 refresh，且所有使用者資料確實移除。

## 15. 實作階段與完成條件

### 階段 1：原生骨架與共用資料

- 建立 Xcode 專案、iOS 16 deployment target、SwiftUI 導航與 Asset Catalog。
- 完成 Domain 模型、JSON 驗證、GRDB migration 與 in-memory 測試替身。
- 完成條件：App 能在 iPhone／iPad 模擬器離線載入 409 筆語料與 100 關，內容驗證全過。

### 階段 2：遊戲核心與前 10 關內部里程碑

- 完成 full／cross、計時、提示、星等、知識卡、研墨題與續玩。
- 完成條件：前 10 關可從地圖進入、完成、重玩與恢復，核心規則 golden tests 與 UI smoke test 通過。

### 階段 3：完整功能對等

- 完成 100 關、兩卷地圖、今日修煉、圖鑑、錯題複習、法寶、世界事件、功名與三種模式。
- 完成條件：README 所列現有玩法逐項有原生實作與測試證據，100 關全量驗證通過。

### 階段 4：登入與跨平台同步

- 完成 Worker、Turso migration、Apple／Google 登入、session、訪客升級、push／pull、匯出與刪除。
- 更新網頁版，使其使用同一進度契約與 API。
- 完成條件：網頁、iPhone、iPad 三端可在離線衝突情境下合併進度，無越權存取，資安測試通過。

### 階段 5：TestFlight

- 完成無障礙、裝置矩陣、效能、隱私權政策、App Privacy、Beta App Review 資料與測試說明。
- 使用者完成 Apple Developer Program 申請後建立 App Store Connect 記錄、簽章與上傳。
- 完成條件：完整 100 關 build 成功進入 TestFlight，外部測試版本通過 Beta App Review，且指定測試者可安裝、登入、離線遊玩與同步。

## 16. 驗收標準

本專案只有在以下條件全部有證據時才算完成：

1. iPhone、iPad 原生 SwiftUI App 均可安裝並完整遊玩 100 關。
2. iOS／iPadOS 16 最低版本可啟動與進行核心流程。
3. 訪客在完全離線狀態可玩、儲存、退出並恢復進度。
4. Apple、Google 登入可在 App 與網頁建立同一站內帳號，且不靠電子郵件自動合併。
5. 網頁、iPhone、iPad 的進度合併符合本規格，不發生完成紀錄倒退。
6. Turso 權杖未出現在 App、網站 bundle、repository 或記錄輸出。
7. 帳號匯出、登出、刪除與本機清除流程可實際完成。
8. 全量內容、原生單元、UI、同步與 Worker 資安測試通過。
9. App 無廣告、無內購、無第三方行為分析與自由文字雲端同步。
10. 完整功能 build 通過 TestFlight Beta App Review，外部測試者可安裝。

## 17. 官方參考

- Apple TestFlight：https://developer.apple.com/testflight/
- Apple App Review Guidelines：https://developer.apple.com/app-store/review/guidelines/
- Sign in with Apple：https://developer.apple.com/sign-in-with-apple/
- Google Sign-In for iOS：https://developers.google.com/identity/sign-in/ios
- Cloudflare Workers＋Turso：https://developers.cloudflare.com/workers/tutorials/connect-to-turso-using-workers/
- Turso Authorization：https://docs.turso.tech/sdk/authorization
