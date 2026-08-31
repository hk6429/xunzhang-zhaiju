# 尋章摘句 iOS／iPadOS App

SwiftUI 原生版本，最低支援 iOS／iPadOS 16。Xcode 專案由 `project.yml` 產生，不直接手改或提交 `.xcodeproj`。

## 環境

- Xcode 16.4 或更新版本（CI 使用 16.4，本機亦以 26 驗證）
- XcodeGen 2.46 或更新版本

```sh
brew install xcodegen
```

## 產生專案

從 repository 根目錄執行：

```sh
node tools/build-app-content-manifest.mjs --check
xcodegen --spec ios/project.yml
xcodebuild -resolvePackageDependencies -project ios/XunZhangZhaiJu.xcodeproj
```

## 建置與測試

先查看本機可用目的地：

```sh
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj -scheme XunZhangZhaiJu -showdestinations
```

再以列出的 Simulator 執行：

```sh
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj \
  -scheme XunZhangZhaiJu \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  test
```

真機簽章與 TestFlight 需先完成 Apple Developer Program 申請；開發階段可直接使用 Simulator。

目前自動驗證包含 62 項單元測試，以及 iPhone 7 項、iPad 8 項適用 UI 測試。UI 測試涵蓋原生封神山河分支地圖、遊戲守護神任務卡與學習目標、關卡與今日奇遇研墨答題、法寶閣、最大字級、iPad 旋轉、系統無障礙稽核，以及終止 App 後強制離線重開的 SQLite 進度保存。交叉題可從字格或線索直接選題，並把輸入焦點移到答案欄；尋句與研墨答對／答錯會提供原生觸覺回饋。事件研讀獎勵會依錯題到期、錯題簿、收藏順序組題，事件彈窗期間會暫停關卡倒數；五件封神法寶使用 Asset Catalog 向量圖顯示碎片、完整狀態與能力。測試用儲存區、離線與無障礙開關只在 Debug 編譯中生效；Release Archive 不會保留 `UI_TEST_*` 行為。

GitHub Actions 的 `Quality` workflow 會在乾淨的 macOS 15／Xcode 16.4 runner 動態選取 iPhone 與 iPad Simulator，重跑測試並建立未簽署 Release Archive。11 吋 iPad 直向時若系統收合側邊欄，UI 測試會實際開啟側邊欄後操作，不假設寬螢幕導覽永遠可見。

## Release Archive 本機驗證

未加入 Apple Developer Program 前，可先建立未簽署的 iPhoneOS Release Archive，驗證實際打包內容；它不能上傳 TestFlight，也不能取代正式簽署驗證。

```sh
xcodebuild -project ios/XunZhangZhaiJu.xcodeproj \
  -scheme XunZhangZhaiJu \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath /path/to/XunZhangZhaiJu.xcarchive \
  CODE_SIGNING_ALLOWED=NO \
  archive

tools/validate-ios-archive.sh /path/to/XunZhangZhaiJu.xcarchive
```

驗證器會比對 `project.yml` 的 Bundle ID、版本、build number 與正式同步 URL，確認 iPhone／iPad device families、加密宣告、App 自有 privacy manifest，以及封存內所有第三方 privacy manifests。另可用 `strings` 檢查正式執行檔，確認沒有 `UI_TEST_*` 測試開關。

## 登入與同步設定

App 未填正式設定時仍會維持完整離線訪客模式，不會連到示範網址。準備上線時，在 `project.yml` 的 target build settings 填入：

- `SYNC_API_BASE_URL`：已部署的 Cloudflare Worker HTTPS 網址
- `GOOGLE_IOS_CLIENT_ID`：Google iOS OAuth client ID
- `GOOGLE_SERVER_CLIENT_ID`：Google Web／server OAuth client ID，後端也必須列入允許 audience
- `GOOGLE_REVERSED_CLIENT_ID`：Google iOS client ID 對應的 reversed URL scheme

Apple 登入已加入 Sign in with Apple entitlement；正式真機與封存仍需在 Apple Developer 後台為 App ID 開啟 capability。Google Sign-In 使用官方 Swift Package `GoogleSignIn` 9.2.0，正式 client ID 建立後才會在「我的」頁顯示按鈕。

登入 session 保存在 Keychain；進度仍先以 SQLite transaction 寫入 snapshot、event、outbox，再於啟動、回到前景及每次本機異動後同步。個人例句只在本機 namespace 間搬移，不會送到 Worker。
