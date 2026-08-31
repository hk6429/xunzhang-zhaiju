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
