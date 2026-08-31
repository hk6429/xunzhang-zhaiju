# 尋章摘句 iOS／iPadOS 原生 App 實作計畫

> 設計來源：`docs/superpowers/specs/2026-09-01-ios-native-app-design.md`

## 目標

以 SwiftUI 全原生重寫《尋章摘句》，最低支援 iOS／iPadOS 16，完整提供 409 筆語料、100 關、兩種盤面、三種遊玩模式及現有學習／留存功能。App 免登入可離線玩；Apple／Google 登入後，網頁、iPhone、iPad 經 Cloudflare Worker 與 Turso 同步進度。最終交付完整 TestFlight 外部測試版。

## 實作原則

- 採測試先行：先建立失敗案例，再寫最小實作使其通過。
- 每個任務只修改列出的責任範圍；發現無關問題只記錄，不順手重構。
- 網頁版目前可運作的資料與規則是對照基準；Swift 不自行發明另一套規則。
- 每一階段都保留可建置、可測試的 main 分支。
- 機密只進 `.env`、Keychain、GitHub Secrets、Cloudflare Worker Secrets，不進 repository 或命令輸出。
- App Store／TestFlight 動作在 Apple Developer Program 完成前只準備素材與設定，不假裝已上線。

## 已驗證開發環境

- Xcode 26.6（Build 17F113）
- Swift 6.3.3
- XcodeGen 已安裝
- Node.js、npm、jq 已安裝
- GRDB.swift 官方目前可由 Swift Package Manager 使用，iOS 13+；本案鎖定 7.10.0、deployment target iOS 16

## 階段 A：原生骨架與共用內容

### 任務 A1：建立版本化內容 manifest

**新增**

- `tools/build-app-content-manifest.mjs`
- `tests/app-content-manifest.test.js`
- `data/app-content-manifest.json`

**測試先行**

1. 測試 manifest 必含 `schemaVersion`、409 筆語料、100 關、每個輸入檔的 SHA-256。
2. 測試任一資料檔變動而未重建 manifest 時必須失敗。
3. 執行 `node --test tests/app-content-manifest.test.js`，先確認失敗。

**實作**

1. 使用 Node `crypto` 計算穩定 SHA-256，不加入新 npm 套件。
2. manifest 使用固定欄位順序與結尾換行，避免無意義 diff。
3. 產生後執行既有 `node tools/validate.mjs data/phrases.json data/levels.json`。

**驗證**

```sh
node tools/build-app-content-manifest.mjs --check
node --test tests/app-content-manifest.test.js
node tools/validate.mjs data/phrases.json data/levels.json
```

**提交**

```text
feat: add versioned app content manifest
```

### 任務 A2：建立 XcodeGen 專案

**新增**

- `ios/project.yml`
- `ios/Config/Info.plist`
- `ios/XunZhangZhaiJu/App/XunZhangZhaiJuApp.swift`
- `ios/XunZhangZhaiJu/App/AppContainer.swift`
- `ios/XunZhangZhaiJu/Features/Root/RootView.swift`
- `ios/XunZhangZhaiJu/DesignSystem/AppTheme.swift`
- `ios/XunZhangZhaiJu/Resources/Assets.xcassets/**`
- `ios/XunZhangZhaiJuTests/SmokeTests.swift`
- `ios/XunZhangZhaiJuUITests/LaunchTests.swift`
- `ios/README.md`

**設定**

- Product：`XunZhangZhaiJu`
- 顯示名稱：`尋章摘句`
- Bundle ID：`tw.edu.hc.zgjh.xunzhangzhaiju`
- Deployment target：iOS 16.0
- 裝置：iPhone、iPad
- Swift language mode：Swift 6
- GRDB.swift：SPM 7.10.0，僅連結 `GRDB`
- Debug 預設自動簽章關閉也能跑 Simulator；真機簽章留待 Apple Developer 帳號完成

**驗證**

```sh
xcodegen --spec ios/project.yml
xcodebuild -list -project ios/XunZhangZhaiJu.xcodeproj
xcodebuild -resolvePackageDependencies -project ios/XunZhangZhaiJu.xcodeproj
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj -scheme XunZhangZhaiJu -destination 'platform=iOS Simulator,name=iPhone 17' build
```

若本機沒有 `iPhone 17` 模擬器，先以 `xcodebuild -showdestinations` 取得實際可用名稱，再更新驗證紀錄，不猜裝置名稱。

**提交**

```text
feat: scaffold native iOS app
```

### 任務 A3：共用 Domain 模型與內容載入

**新增**

- `ios/XunZhangZhaiJu/Domain/Phrase.swift`
- `ios/XunZhangZhaiJu/Domain/Level.swift`
- `ios/XunZhangZhaiJu/Domain/GridCoordinate.swift`
- `ios/XunZhangZhaiJu/Domain/ContentManifest.swift`
- `ios/XunZhangZhaiJu/Content/ContentLoader.swift`
- `ios/XunZhangZhaiJu/Content/ContentValidator.swift`
- `ios/XunZhangZhaiJuTests/ContentDecodingTests.swift`
- `ios/XunZhangZhaiJuTests/ContentValidationTests.swift`

**測試案例**

- 解碼全部 409 筆語料、100 關及 832 個關卡目標。
- 支援成語、諺語、俗語及 11 種文學類型的可選 metadata。
- 支援 `full`／`cross`、`E`／`S` 與現有資料實際出現的全部方向。
- 拒絕未知 enum、越界座標、遺失 phrase、錯誤 grid 尺寸、錯誤 manifest hash。
- cross 的 revealed 與路徑仍符合既有驗證規則。

**驗證**

```sh
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj -scheme XunZhangZhaiJu -destination '<可用 iOS Simulator>' test
```

**提交**

```text
feat: load and validate shared game content
```

### 任務 A4：建立本機 SQLite 儲存

**新增**

- `ios/XunZhangZhaiJu/Persistence/AppDatabase.swift`
- `ios/XunZhangZhaiJu/Persistence/AppMigrations.swift`
- `ios/XunZhangZhaiJu/Persistence/Records/**`
- `ios/XunZhangZhaiJu/Persistence/ProgressRepository.swift`
- `ios/XunZhangZhaiJu/Persistence/KeychainStore.swift`
- `ios/XunZhangZhaiJuTests/PersistenceMigrationTests.swift`
- `ios/XunZhangZhaiJuTests/ProgressRepositoryTests.swift`

**第一版資料表**

- `progressSnapshot`
- `progressEvent`
- `syncOutbox`
- `localPhrasePractice`
- `appSetting`
- `migrationLog`

**測試案例**

- 全新資料庫 migration 成功且可重複開啟。
- 寫入 snapshot、event、outbox 同 transaction；任一步失敗全部 rollback。
- 帳號與訪客 namespace 完整隔離。
- device UUID 在 Keychain 存在後穩定，不使用 IDFA。
- migration 失敗不覆寫原資料庫。

**提交**

```text
feat: add offline progress database
```

## 階段 B：遊戲核心與前 10 關內部里程碑

### 任務 B1：建立跨語言 golden fixtures

**新增／修改**

- `data/fixtures/native-parity/*.json`
- `tools/generate-native-fixtures.mjs`
- `tests/native-fixtures.test.js`
- `ios/XunZhangZhaiJuTests/NativeParityTests.swift`

**涵蓋**

- target path 與方向 snap
- full 選句成功／失敗
- cross 填字成功／失敗
- 三級提示與星等
- 計時暫停／超時
- 每日 seed
- 進度正規化與合併

**完成條件**

JavaScript 產生的固定輸出與 Swift 計算完全一致。

### 任務 B2：純 Swift GameEngine 狀態機

**新增**

- `ios/XunZhangZhaiJu/GameEngine/GameEngine.swift`
- `ios/XunZhangZhaiJu/GameEngine/GameState.swift`
- `ios/XunZhangZhaiJu/GameEngine/GameAction.swift`
- `ios/XunZhangZhaiJu/GameEngine/GameReducer.swift`
- `ios/XunZhangZhaiJu/GameEngine/Clock.swift`
- `ios/XunZhangZhaiJuTests/GameEngineTests.swift`

**測試案例**

- `preparing → running → completed／timedOut` 合法轉移。
- 知識卡、研墨題、背景與系統中斷時倒數暫停。
- Reveal 使該關星等上限為 1，其他提示使上限為 2，零提示才可 3 星。
- 超時重來清空本局 found，但不倒扣圖鑑。
- Scene 重建、裝置旋轉不重置 run。

### 任務 B3：提示、研墨與收藏

**新增**

- `ios/XunZhangZhaiJu/GameEngine/HintEngine.swift`
- `ios/XunZhangZhaiJu/GameEngine/LearningQuizEngine.swift`
- `ios/XunZhangZhaiJu/GameEngine/CollectionEngine.swift`
- 對應 XCTest

**不變式**

- 墨水只能由正確學習題增加。
- 不足時不能扣成負數。
- Revealed phrase 不進圖鑑。
- Choice／fill 的題源優先本關目標。

### 任務 B4：原生 full 盤面

**新增**

- `ios/XunZhangZhaiJu/Features/Game/FullBoardView.swift`
- `ios/XunZhangZhaiJu/Features/Game/SelectionOverlay.swift`
- `ios/XunZhangZhaiJu/Features/Game/ZoomableBoardContainer.swift`
- `ios/XunZhangZhaiJuUITests/FullBoardUITests.swift`

**驗收**

- 單指拖選不觸發雙指平移。
- 雙指縮放／平移 20×20 仍能精確命中字格。
- iPhone 小螢幕與 iPad 直橫向可操作。
- VoiceOver 可用「起點→終點」替代拖曳。

### 任務 B5：原生 cross 盤面與中文鍵盤

**新增**

- `ios/XunZhangZhaiJu/Features/Game/CrossBoardView.swift`
- `ios/XunZhangZhaiJu/Features/Game/ClueListView.swift`
- `ios/XunZhangZhaiJu/Features/Game/AnswerInputView.swift`
- `ios/XunZhangZhaiJuUITests/CrossBoardUITests.swift`

**驗收**

- 點格子或線索都能選詞。
- 中文注音鍵盤出現時輸入框與當前線索保持可見。
- 交叉格連動正確；錯誤不洩漏答案。
- VoiceOver 能讀線索、輸入狀態與已揭露交叉字。

### 任務 B6：前 10 關導航與內部里程碑

**新增**

- `Features/Map/**`
- `Features/Game/GameView.swift`
- `Features/Game/GameViewModel.swift`
- `Features/Game/KnowledgeCardView.swift`
- `Features/Game/CompletionView.swift`

**完成條件**

- iPhone TabView、iPad NavigationSplitView 可進入前 10 關。
- 可破關、重玩、續玩、恢復本機進度。
- App 關閉重開後進度仍存在。
- 全部 A、B 測試通過後提交：

```text
feat: complete native ten-level gameplay milestone
```

## 階段 C：100 關完整功能對等

### 任務 C1：完整雙卷地圖與章節

- 匯入 `chamber-map-v2.webp`、角色、法寶、密室與品牌資產到 Asset Catalog。
- 實作前 50 關山河分支節點、事件、Boss 與後 50 關文林淬鍊卷。
- 以資料 registry 的 Swift 模型取代執行期 JavaScript registry。

### 任務 C2：留存與學習功能

- 移植每日三帖、一炷香快陣、連續紀錄、補簽、錯題間隔複習。
- 移植功名進度、三種模式、最佳成績、休息提醒、未完成 run。
- 每個模組與 `js/retention.js` 建立 parity fixtures。

### 任務 C3：封神世界、法寶與事件

- 移植 world events、daily encounters、treasure shards、passives、lore、hidden ending。
- 聯集型進度必產生可合併事件，不允許 UI 直接修改 snapshot。

### 任務 C4：摘句集與本機自由例句

- 圖鑑依文體、朝代、作者篩選。
- 知識卡、白話釋義與延伸體會完整呈現。
- 自由例句／使用情境寫入 `localPhrasePractice`，資料結構不出現在 sync payload。

### 任務 C5：全量功能對等稽核

- 建立 `docs/ios/feature-parity.md`，逐項映射 README／JS 模組至 Swift 實作與測試。
- 100 關全量 smoke：載入、進場、合法完成路徑、結算。
- 完成後提交：

```text
feat: reach full native game feature parity
```

## 階段 D：自建登入、Turso 與跨平台同步

### 任務 D1：凍結 v1 同步契約

**新增**

- `docs/contracts/progress-events-v1.schema.json`
- `docs/contracts/progress-snapshot-v1.schema.json`
- `docs/contracts/sync-api-v1.md`
- JS 與 Swift contract tests

**事件 payload 禁止自由文字欄位。**

### 任務 D2：建立 sync-worker 與 Turso migration

**新增**

- `sync-worker/package.json`
- `sync-worker/wrangler.jsonc`
- `sync-worker/src/index.ts`
- `sync-worker/src/db.ts`
- `sync-worker/src/routes/**`
- `sync-worker/migrations/0001_initial.sql`
- `sync-worker/test/**`

**安全要求**

- Turso URL／token 只讀 Worker Secrets。
- userId 只從已驗證 session 取得。
- `(user_id, event_id)` unique；SQL 全部參數化。
- body size、CORS、rate limit 與錯誤碼明確。

### 任務 D3：Apple／Google 原生登入與自有 session

- iOS：AuthenticationServices、Google Sign-In SDK、nonce、Keychain。
- Worker：Apple／Google JWKS、issuer／audience／expiry／nonce 驗證。
- 短效 access JWT、雜湊 refresh token、rotation、replay family revoke。
- 不保存 provider token、姓名、email、頭像。
- 帳號連結必須明確二次驗證，不依 email 自動合併。

### 任務 D4：iOS outbox 與合併

- push／pull、serverSequence、重送、亂序、重複、退避。
- 訪客認領、帳號 namespace、登出隔離。
- 墨水 ledger、聯集、max／min、台北日期等規格合併規則全測試。

### 任務 D5：更新現有網頁版

- 增加 Apple／Google Web OAuth Authorization Code＋PKCE。
- 使用 Secure、HttpOnly、SameSite cookie；provider token 不進 localStorage。
- 將現有 localStorage 存檔轉成 v1 events，保留免登入本機模式。
- 網頁與 iOS 使用相同 contract fixtures。

### 任務 D6：匯出、登出與刪除

- App 與網頁提供資料匯出。
- 雲端刪除與本機清除分開確認。
- 刪除後 refresh 不可使用，Turso 該使用者 identity、session、event、snapshot、user 全部不存在。

## 階段 E：無障礙、資安與 TestFlight

### 任務 E1：裝置與無障礙矩陣

- iPhone 小／中／大螢幕、iPad 直向／橫向／Split View。
- iOS 16 最低版與目前最新版。
- Dynamic Type、高對比、Reduce Motion、VoiceOver、中文注音鍵盤。
- 20×20 手勢與替代選句。

### 任務 E2：效能與可靠性

- 409 筆語料、100 關載入時間與記憶體基線。
- 20×20 盤面拖曳保持可用幀率。
- 10,000 進度事件的 snapshot compaction 與啟動時間。
- 網路切換、Worker 故障、token 過期、schema 不相容、SQLite migration 失敗。

### 任務 E3：資安驗收

- 偽造／過期／錯 audience token、nonce/state、refresh replay。
- 越權 userId、重複 event、未知 payload、超大 body、SQL injection。
- repository、App bundle、網頁 bundle、測試與 logs 掃描不得含 Turso／Apple／Google 機密。

### 任務 E4：TestFlight 準備與送測

- 使用者完成 Apple Developer Program。
- 建立正式 Bundle ID、App Store Connect、Sign in with Apple capability、Google iOS client。
- 完成 App Icon、截圖、Beta 描述、測試說明、隱私權政策與 App Privacy。
- Archive、上傳、內部測試；外部群組第一個 build 送 Beta App Review。
- 實際 TestFlight 安裝驗證登入、離線、同步與 100 關內容。

## 每階段共通驗證

```sh
node --test
node tools/validate.mjs data/phrases.json data/levels.json
node tools/validate-visuals.mjs
xcodegen --spec ios/project.yml
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj -scheme XunZhangZhaiJu -destination '<可用 iOS Simulator>' test
git diff --check
git status --short
```

後端加入後再增加 `sync-worker` 的官方 package scripts；先讀 `npm run` 列出的實際 scripts，再執行，不猜 script 名稱。

## 完成證據

只有下列證據全部存在才可宣告完成：

1. 100 關全量內容與 Swift parity tests 通過。
2. iPhone／iPad iOS 16+ 建置與 UI 測試通過。
3. 完全離線訪客流程實機或模擬器驗證通過。
4. 網頁、iPhone、iPad 三端同步衝突測試通過。
5. Apple／Google 登入、帳號連結、匯出與刪除實測通過。
6. 機密掃描與 Worker 越權／token／replay 測試通過。
7. 完整 100 關 build 已由外部測試者從 TestFlight 安裝並通過核心 smoke。
