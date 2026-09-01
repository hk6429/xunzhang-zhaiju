# iOS 原生功能對等表

更新日期：2026-09-01

| Web／規格模組 | SwiftUI 原生實作 | 驗證 |
|---|---|---|
| 409 條語料、100 關、full／cross 盤面 | `ContentLoader`、`FullBoardView`、`CrossBoardView` | `ContentDecodingTests`、`ContentValidationTests`、`AllLevelsSmokeTests` |
| 沉浸式遊戲任務、守護神、學習目標與可選線索 | `GameView`、`AnswerInputView`、原生 Guardian Assets | iPhone／iPad UI tests；守護神任務卡與學習目標 presence assertion |
| 關卡內研墨題、墨水獎勵與原生觸覺回饋 | `GameLearningQuizView`、`LearningQuizEngine`、`DailyProgressEngine`、`UINotificationFeedbackGenerator` | 暫停／恢復與墨水單元測試；iPhone／iPad 答題 UI＋系統無障礙稽核 |
| 三種模式、單調時鐘倒數、教育彈窗／背景暫停、重試 | `GameEngine`、`GameViewModel`；以 `systemUptime` 實際經過時間扣除倒數，暫停與恢復時重設時鐘錨點；找詞、送出答案與提示操作前先結算真實時間 | `GameEngineTests`、`GameViewModelTests`；涵蓋 timer 延遲、長時間暫停、時鐘倒退，以及倒數歸零後拒絕揭示／誤選／答案操作 |
| 圈首字／閃現／揭示與墨水成本 | `HintEngine`、`GameViewModel` | `LearningEnginesTests`、`NativeParityTests` |
| 星等、最佳成績、續玩、休息提醒 | `AppContainer`、`LocalLevelStats`、`ProfileView`；計時關卡保存最短完成時間，跨裝置同步取最短值且相容舊資料 | `GameEngineTests`、`LocalProgressMergeEngineTests`、`SyncContractTests`、`DailyProgressEngineTests` |
| 十章地圖與世界事件 | `JourneyView`、`WorldProgressEngine`；事件研讀獎勵直接開啟原生研墨題，事件彈窗暫停倒數 | 效果冪等、研讀題數與倒數暫停單元測試；iPhone／iPad 今日奇遇答題 UI＋系統無障礙稽核 |
| 功名進度、普通結局與隱藏真結局 | `JourneyView`、`WorldProgressEngine`；依第 50 關、五場 Boss 二星、五段故事與五件完整法寶判定，隱藏問答結果可離線保存並跨端同步 | 結局條件、法寶完整性與新舊答案合併單元測試；iPhone／iPad 作答、無障礙稽核及終止後重開 UI test |
| 每日三帖、快陣、連續修煉、補簽 | `DailyView`、`DailyProgressEngine` | `DailyProgressEngineTests` |
| 錯題本、間隔複習、精熟 | `CollectionView`、`DailyProgressEngine`、`ReviewSchedule`；答錯十分鐘、答對 1／3／7／14／30 天，精確時間跨端同步；快陣、到期複習與待補研墨分流記錄 | `DailyProgressEngineTests`、`LearningEnginesTests`、`LocalProgressMergeEngineTests`、`SyncContractTests`、Web／Worker 同步測試 |
| 圖鑑搜尋、文體／朝代篩選 | `CollectionView`、`CollectionEngine` | `LearningEnginesTests`、UI tests |
| 法寶碎片、事件效果、典藏 | `WorldProgressEngine`、`TreasureAbilityEngine`、`TreasurePassiveEngine`、`CollectionView`；五件故事法寶會標記事件節點、開啟支線捷徑、每日一次預覽事件效果、指出今日奇遇區域，並作為真結局入口條件；十章被動法寶則依完成關卡補發碎片，實際增加倒數、提早連擊、擴充複習名額、增加答錯補救或提供額外線索 | `WorldProgressEngineTests`、`TreasurePassiveEngineTests`、Web／Swift 法寶目錄對等測試、iPhone／iPad 法寶閣與今日奇遇 UI tests |
| 個人例句／使用情境 | `KnowledgeCardView`、`localPhrasePractice` | `ProgressRepositoryTests.testLocalPracticeStaysOutsideSyncOutbox` |
| 完整離線訪客模式 | GRDB snapshot／event／outbox | migration、repository、launch UI tests |
| Apple／Google 登入與雙身分連結 | AuthenticationServices、GoogleSignIn 9.2、Web OAuth、Keychain／HttpOnly cookies | Worker auth tests、Simulator build；正式 token 待 OAuth／Apple Developer 設定 |
| iPhone／iPad／Web 同步 | `SyncClient`、`cloud-sync.js`、Cloudflare Worker、Turso migrations | production／staging 已部署；iOS merge/outbox、Web、Worker tests 通過，正式 OAuth 三端 E2E 待驗 |
| 墨滴跨裝置結算 | event `inkDelta`、Turso transaction、權威雲端餘額 | Web／Swift merge tests、Worker merge tests、migration smoke |
| 匯出、登出與帳號刪除 | iOS／Web controls、session family revoke、分開確認本機清除 | Worker auth tests、iOS build；正式環境 E2E 待部署 |
| 大量離線事件維護 | 同步後只壓縮已確認事件，永不刪除未送 outbox | 10,000 筆 repository 壓力測試 |
| 隱私揭露與 required-reason API | `PrivacyInfo.xcprivacy`、隱私權政策、App Privacy 對照表 | 未簽署 Release Archive 已聚合驗證 12 份 manifest、9 類資料與套件 pins；正式簽署 privacy report 待驗 |
| 動態文字、VoiceOver、Reduce Motion | 測試字級啟動路徑、盤面逐格按鈕、可選線索與無動畫縮放 | iPhone／11 與 13 吋 iPad 系統無障礙稽核、最大字級與旋轉通過；真機 VoiceOver／Reduce Motion 待驗 |
| App Store 顯示素材 | 6.9 吋 iPhone、13 吋 iPad 原生畫面與繁中 metadata | JPEG 尺寸／alpha、文字字數與關鍵字 bytes 自動驗證 |

## 尚待正式環境驗收

- Web OAuth、帳號連結、資料匯出與帳號刪除的正式供應商 E2E。
- Worker refresh rotation、rate limit、越權與 replay 的正式整合測試；cookie CSRF 已有來源檢查與本機測試。
- iPhone／iPad 真機的 VoiceOver、Reduce Motion、Split View、飛航模式與效能矩陣。
- Apple Developer Program、正式簽章、正式 OAuth client、三端登入 E2E 與 TestFlight 外部測試。

本表只把已有程式與測試列為完成；需要正式帳號或外部服務的項目不以 Simulator 結果冒充上線證據。
