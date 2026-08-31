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
| iPhone／iPad／Web 同步 | `SyncClient`、`cloud-sync.js`、Cloudflare Worker、Turso migrations | production／staging 已部署；iOS merge/outbox、Web、Worker tests 通過，正式 OAuth 三端 E2E 待驗 |
| 墨滴跨裝置結算 | event `inkDelta`、Turso transaction、權威雲端餘額 | Web／Swift merge tests、Worker merge tests、migration smoke |
| 匯出、登出與帳號刪除 | iOS／Web controls、session family revoke、分開確認本機清除 | Worker auth tests、iOS build；正式環境 E2E 待部署 |
| 大量離線事件維護 | 同步後只壓縮已確認事件，永不刪除未送 outbox | 10,000 筆 repository 壓力測試 |
| 隱私揭露與 required-reason API | `PrivacyInfo.xcprivacy`、隱私權政策、App Privacy 對照表 | 未簽署 Release Archive 已聚合驗證 12 份 manifest、9 類資料與套件 pins；正式簽署 privacy report 待驗 |
| 動態文字、VoiceOver、Reduce Motion | 測試字級啟動路徑、盤面逐格按鈕、無動畫縮放 | iPhone／11 與 13 吋 iPad 系統無障礙稽核、最大字級與旋轉通過；真機 VoiceOver／Reduce Motion 待驗 |
| App Store 顯示素材 | 6.9 吋 iPhone、13 吋 iPad 原生畫面與繁中 metadata | JPEG 尺寸／alpha、文字字數與關鍵字 bytes 自動驗證 |

## 尚待正式環境驗收

- Web OAuth、帳號連結、資料匯出與帳號刪除的正式供應商 E2E。
- Worker refresh rotation、rate limit、越權與 replay 的正式整合測試；cookie CSRF 已有來源檢查與本機測試。
- iPhone／iPad 真機的 VoiceOver、Reduce Motion、Split View、飛航模式與效能矩陣。
- Apple Developer Program、正式簽章、正式 OAuth client、三端登入 E2E 與 TestFlight 外部測試。

本表只把已有程式與測試列為完成；需要正式帳號或外部服務的項目不以 Simulator 結果冒充上線證據。
