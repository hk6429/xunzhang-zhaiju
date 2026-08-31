# 尋章摘句 iOS／iPadOS App

SwiftUI 原生版本，最低支援 iOS／iPadOS 16。Xcode 專案由 `project.yml` 產生，不直接手改或提交 `.xcodeproj`。

## 環境

- Xcode 26 或更新版本
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

目前自動驗證包含 56 項單元測試，以及 iPhone 6 項、iPad 7 項適用 UI 測試。UI 測試涵蓋最大字級、iPad 旋轉、系統無障礙稽核，以及終止 App 後強制離線重開的 SQLite 進度保存。測試用儲存區、離線與無障礙開關只在 Debug 編譯中生效；Release Archive 不會保留 `UI_TEST_*` 行為。

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
