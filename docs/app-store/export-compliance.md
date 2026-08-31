# 加密出口合規判定草案

更新日期：2026-09-01

目前 App 使用 HTTPS、Apple 系統 Keychain／AuthenticationServices，以及登入套件所需的標準驗證機制，沒有自行實作專有或未公開的加密演算法。依目前實作，`Info.plist` 設定：

```text
ITSAppUsesNonExemptEncryption = NO
```

此值表示 App 與所連結的第三方套件只使用無加密或符合豁免條件的加密，藉此避免每次上傳都重複回答同一組問題。正式封存前仍須檢查 GoogleSignIn、GRDB 與新增的所有套件；若日後加入非標準密碼學、VPN、安全通訊產品功能或其他受管制功能，必須重新判定，不可沿用本結論。

參考：[Apple Export Compliance Overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)、[`ITSAppUsesNonExemptEncryption`](https://developer.apple.com/documentation/BundleResources/Information-Property-List/ITSAppUsesNonExemptEncryption)。
