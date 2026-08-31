import SwiftUI
import GoogleSignIn

@main
struct XunZhangZhaiJuApp: App {
    @StateObject private var container = AppContainer()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(container)
                .tint(AppTheme.accent)
                .preferredColorScheme(.dark)
                .task { await container.syncNow() }
                .onOpenURL { url in
                    _ = GIDSignIn.sharedInstance.handle(url)
                }
                .onChange(of: scenePhase) { newPhase in
                    if newPhase == .active { Task { await container.syncNow() } }
                }
        }
    }
}
