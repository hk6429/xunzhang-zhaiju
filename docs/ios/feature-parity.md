# iOS 原生功能對等表

更新日期：2026-09-01

| Web／規格模組 | SwiftUI 原生實作 | 驗證 |
|---|---|---|
| 409 條語料、100 關、full／cross 盤面 | `ContentLoader`、`FullBoardView`、`CrossBoardView` | `ContentDecodingTests`、`ContentValidationTests`、`AllLevelsSmokeTests` |
| 三種模式、倒數、背景暫停、重試 | `GameEngine`、`GameViewModel` | `GameEngineTests`、`GameViewModelTests` |
| 圈首字／閃現／揭示與墨水成本 | `HintEngine`、`GameViewModel` | `LearningEnginesTests`、`NativeParityTests` |
| 星等、最佳成績、續玩、休息提醒 | `AppContainer`、`LocalLevelStats`、`ProfileView` | `GameViewModelTests`、`DailyProgressEngineTests` |
| 十章地圖與世界事件 | `JourneyView`、`WorldProgressEngine` | `WorldProgressEngineTests`、UI tests |
| 每日三帖、快陣、連續修煉、補簽 | `DailyView`、`DailyProgressEngine` | `DailyProgressEngineTests` |
| 錯題本、間隔複習、精熟 | `CollectionView`、`DailyProgressEngine` | `DailyProgressEngineTests` |
| 圖鑑搜尋、文體／朝代篩選 | `CollectionView`、`CollectionEngine` | `LearningEnginesTests`、UI tests |
| 法寶碎片、事件效果、典藏 | `WorldProgressEngine`、`CollectionView` | `WorldProgressEngineTests` |
| 個人例句／使用情境 | `KnowledgeCardView`、`localPhrasePractice` | `ProgressRepositoryTests.testLocalPracticeStaysOutsideSyncOutbox` |
| 完整離線訪客模式 | GRDB snapshot／event／outbox | migration、repository、launch UI tests |
| Apple／Google 登入與雙身分連結 | AuthenticationServices、GoogleSignIn 9.2、Web OAuth、Keychain／HttpOnly cookies | Worker auth tests、Simulator build；正式 token 待 OAuth／Apple Developer 設定 |
| iPhone／iPad／Web 同步 | `SyncClient`、`cloud-sync.js`、Cloudflare Worker、Turso migrations | iOS merge/outbox、Web、Worker tests；正式三端 E2E 待部署 |
| 墨滴跨裝置結算 | event `inkDelta`、Turso transaction、權威雲端餘額 | Web／Swift merge tests、Worker merge tests、migration smoke |
| 匯出、登出與帳號刪除 | iOS／Web controls、session family revoke、分開確認本機清除 | Worker auth tests、iOS build；正式環境 E2E 待部署 |

## 尚待正式環境驗收

- Web OAuth、帳號連結、資料匯出與帳號刪除的正式供應商 E2E。
- Worker refresh rotation、rate limit、越權、CSRF 與 replay 的整合測試。
- iPad UI runner、Dynamic Type、VoiceOver、Split View 與效能矩陣。
- Apple Developer Program、正式 OAuth client、Turso／Worker 部署與 TestFlight 外部測試。

本表只把已有程式與測試列為完成；需要正式帳號或外部服務的項目不以 Simulator 結果冒充上線證據。
