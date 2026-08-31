import AuthenticationServices
import GoogleSignIn
import GoogleSignInSwift
import SwiftUI
import UIKit

struct ProfileView: View {
    @EnvironmentObject private var container: AppContainer
    @AppStorage("play-mode") private var playMode = PlayMode.standard.rawValue
    @State private var restMessage = ""
    @State private var appleNonce: (raw: String, hash: String, isLink: Bool)?
    @State private var authMessage = ""
    @State private var exportURL: URL?
    @State private var confirmsCloudDeletion = false
    @State private var confirmsLocalDeletion = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                rankCard
                statsGrid
                modeCard
                if (container.progress.activity?.levelsSinceRest ?? 0) >= 3 {
                    restCard
                }
                syncCard
            }
            .padding()
        }
        .background(AppTheme.background)
        .navigationTitle("我的")
        .confirmationDialog(
            "確定刪除雲端帳號？",
            isPresented: $confirmsCloudDeletion,
            titleVisibility: .visible
        ) {
            Button("刪除雲端帳號", role: .destructive) {
                Task {
                    if await container.deleteCloudAccount() {
                        confirmsLocalDeletion = true
                    }
                }
            }
        } message: {
            Text("Turso 中的登入身分、session、事件與快照都會刪除；這台裝置的離線資料會先保留。")
        }
        .confirmationDialog(
            "也清除這台裝置的帳號資料？",
            isPresented: $confirmsLocalDeletion,
            titleVisibility: .visible
        ) {
            Button("清除本機帳號資料", role: .destructive) {
                do { try container.clearDeletedAccountLocalData() }
                catch { authMessage = error.localizedDescription }
            }
            Button("保留本機資料", role: .cancel) {}
        } message: {
            Text("個人例句只存在本機，也會一併清除。這一步和雲端刪除分開確認。")
        }
    }

    private var rankCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "rosette")
                .font(.system(size: 46))
                .foregroundStyle(AppTheme.accent)
            Text(rank.title)
                .font(.largeTitle.bold())
            Text("修為 \(cultivationScore)")
                .foregroundStyle(AppTheme.secondaryText)
            ProgressView(value: Double(cultivationScore), total: Double(max(rank.nextNeed, 1)))
                .tint(AppTheme.accent)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var statsGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                stat("已破字陣", value: completedLevels, symbol: "seal")
                stat("累積星數", value: totalStars, symbol: "star.fill")
                stat("摘句收藏", value: container.progress.collection.count, symbol: "books.vertical")
            }
            HStack(spacing: 12) {
                stat("精熟句子", value: masteredCount, symbol: "checkmark.seal")
                stat("獲得星章", value: badgeCount, symbol: "medal")
                stat("連續修煉", value: container.progress.streak?.current ?? 0, symbol: "flame.fill")
            }
        }
    }

    private var modeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("遊玩模式").font(.headline)
            Picker("遊玩模式", selection: $playMode) {
                ForEach(PlayMode.allCases, id: \.rawValue) { mode in
                    Text(mode.label).tag(mode.rawValue)
                }
            }
            .pickerStyle(.segmented)
            Text("悟道時間較寬裕；標準維持原規則；天劫時間更緊、提示更少。")
                .font(.footnote)
                .foregroundStyle(AppTheme.secondaryText)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var syncCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(container.isSignedIn ? "跨裝置同步已開啟" : "訪客模式・完整離線可玩", systemImage: "iphone.and.arrow.forward")
                .font(.headline)
            Text(syncDescription)
                .font(.subheadline)
                .foregroundStyle(AppTheme.secondaryText)

            if container.isSignedIn {
                HStack {
                    Button("立即同步") { Task { await container.syncNow() } }
                        .buttonStyle(.borderedProminent)
                        .disabled(container.syncState == .syncing)
                    Button("登出", role: .destructive) {
                        GIDSignIn.sharedInstance.signOut()
                        Task { await container.signOut() }
                    }
                    .buttonStyle(.bordered)
                }
                HStack {
                    Button("準備資料匯出") {
                        Task { exportURL = await container.exportAccount() }
                    }
                    .buttonStyle(.bordered)
                    Button("刪除雲端帳號", role: .destructive) {
                        confirmsCloudDeletion = true
                    }
                    .buttonStyle(.bordered)
                }
                Text("可再次驗證另一個供應商來連結帳號；不會用相同 email 自動合併。")
                    .font(.caption)
                    .foregroundStyle(AppTheme.secondaryText)
                SignInWithAppleButton(.continue) { request in
                    prepareAppleRequest(request, isLink: true)
                } onCompletion: { result in
                    handleApple(result)
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 44)
                if SyncConfiguration.googleIsConfigured {
                    Button("連結 Google") { signInWithGoogle(isLink: true) }
                        .buttonStyle(.bordered)
                }
                if let exportURL {
                    ShareLink(item: exportURL) {
                        Label("分享帳號資料 JSON", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else if SyncConfiguration.baseURL != nil {
                SignInWithAppleButton(.signIn) { request in
                    prepareAppleRequest(request, isLink: false)
                } onCompletion: { result in
                    handleApple(result)
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 44)

                if SyncConfiguration.googleIsConfigured {
                    GoogleSignInButton(action: { signInWithGoogle(isLink: false) })
                        .frame(height: 44)
                } else {
                    Text("Google 登入待填入正式 OAuth client ID。")
                        .font(.caption)
                        .foregroundStyle(AppTheme.secondaryText)
                }
            } else {
                Text("同步服務尚未部署；目前所有進度仍安全保存在本機。")
                    .font(.caption)
                    .foregroundStyle(AppTheme.secondaryText)
            }

            if !authMessage.isEmpty {
                Text(authMessage).font(.caption).foregroundStyle(.orange)
            }
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private var syncDescription: String {
        switch container.syncState {
        case .idle:
            return container.isSignedIn ? "登入身分已保存在 Keychain；有網路時可同步 iPhone、iPad 與 Web 進度。" : "不登入也能玩完整 100 關；登入只用來跨裝置同步。"
        case .syncing:
            return "正在合併本機與雲端進度……"
        case let .synced(date):
            return "最近同步：\(date.formatted(date: .omitted, time: .shortened))"
        case let .failed(message):
            return "尚未同步：\(message)"
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        defer { appleNonce = nil }
        do {
            let authorization = try result.get()
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken,
                  let idToken = String(data: data, encoding: .utf8),
                  let nonce = appleNonce else {
                authMessage = "Apple 沒有回傳可驗證的登入憑證。"
                return
            }
            Task {
                if nonce.isLink {
                    if await container.linkIdentity(provider: .apple, idToken: idToken, nonce: nonce.hash) {
                        authMessage = "Apple 登入方式已連結。"
                    }
                } else {
                    await container.signIn(provider: .apple, idToken: idToken, nonce: nonce.hash)
                }
            }
        } catch {
            authMessage = error.localizedDescription
        }
    }

    private func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest, isLink: Bool) {
        do {
            let nonce = try AuthNonce.make()
            appleNonce = (nonce.raw, nonce.hash, isLink)
            request.requestedScopes = [.email]
            request.nonce = nonce.hash
        } catch {
            authMessage = error.localizedDescription
        }
    }

    private func signInWithGoogle(isLink: Bool) {
        guard let presenter = UIApplication.shared.activeRootViewController else {
            authMessage = "找不到可顯示 Google 登入的畫面。"
            return
        }
        Task {
            do {
                let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenter)
                guard let token = result.user.idToken?.tokenString else {
                    authMessage = "Google 沒有回傳 ID token。"
                    return
                }
                if isLink {
                    if await container.linkIdentity(provider: .google, idToken: token) {
                        authMessage = "Google 登入方式已連結。"
                    }
                } else {
                    await container.signIn(provider: .google, idToken: token)
                }
            } catch {
                authMessage = error.localizedDescription
            }
        }
    }

    private var restCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("已連破三陣，讓眼睛歇一歇", systemImage: "cup.and.saucer.fill")
                .font(.headline)
            Text("看看遠方、喝口水，再回來找字會更俐落。")
                .foregroundStyle(AppTheme.secondaryText)
            Button("我歇過了") {
                do {
                    try container.takeRest()
                    restMessage = "精神回滿，再出發。"
                } catch {
                    restMessage = error.localizedDescription
                }
            }
            .buttonStyle(.bordered)
            if !restMessage.isEmpty { Text(restMessage).font(.caption) }
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
    }

    private func stat(_ title: String, value: Int, symbol: String) -> some View {
        VStack(spacing: 7) {
            Image(systemName: symbol).foregroundStyle(AppTheme.accent)
            Text(String(value)).font(.title2.bold())
            Text(title).font(.caption)
        }
        .foregroundStyle(AppTheme.primaryText)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
    }

    private var completedLevels: Int {
        container.progress.levels.values.filter { $0.stars > 0 }.count
    }

    private var totalStars: Int {
        container.progress.levels.values.reduce(0) { $0 + min(3, $1.stars) }
    }

    private var cultivationScore: Int {
        totalStars + container.progress.collection.count / 10 + badgeCount + masteredCount / 5
    }

    private var masteredCount: Int {
        (container.progress.mastery ?? [:]).values.filter(\.mastered).count
    }

    private var badgeCount: Int {
        (container.progress.levelStats ?? [:]).values.reduce(0) { $0 + Set($1.badges).count }
    }

    private var rank: (title: String, nextNeed: Int) {
        let ranks = [(0, "白丁"), (6, "童生"), (20, "秀才"), (45, "舉人"), (75, "貢士"),
                     (110, "進士"), (140, "狀元"), (190, "翰林"), (250, "大學士"), (320, "文宗"), (420, "文曲星君")]
        let current = ranks.last { cultivationScore >= $0.0 } ?? ranks[0]
        let next = ranks.first { $0.0 > cultivationScore }?.0 ?? current.0
        return (current.1, next)
    }
}

private extension UIApplication {
    @MainActor
    var activeRootViewController: UIViewController? {
        connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }?
            .keyWindow?
            .rootViewController
    }
}
