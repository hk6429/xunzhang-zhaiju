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

## 登入與同步設定

App 未填正式設定時仍會維持完整離線訪客模式，不會連到示範網址。準備上線時，在 `project.yml` 的 target build settings 填入：

- `SYNC_API_BASE_URL`：已部署的 Cloudflare Worker HTTPS 網址
- `GOOGLE_IOS_CLIENT_ID`：Google iOS OAuth client ID
- `GOOGLE_SERVER_CLIENT_ID`：Google Web／server OAuth client ID，後端也必須列入允許 audience
- `GOOGLE_REVERSED_CLIENT_ID`：Google iOS client ID 對應的 reversed URL scheme

Apple 登入已加入 Sign in with Apple entitlement；正式真機與封存仍需在 Apple Developer 後台為 App ID 開啟 capability。Google Sign-In 使用官方 Swift Package `GoogleSignIn` 9.2.0，正式 client ID 建立後才會在「我的」頁顯示按鈕。

登入 session 保存在 Keychain；進度仍先以 SQLite transaction 寫入 snapshot、event、outbox，再於啟動、回到前景及每次本機異動後同步。個人例句只在本機 namespace 間搬移，不會送到 Worker。
