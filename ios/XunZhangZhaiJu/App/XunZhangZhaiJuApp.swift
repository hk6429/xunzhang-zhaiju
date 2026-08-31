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
                .accessibilityTextTest(RuntimeEnvironment.forcesAccessibilityText)
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

private extension View {
    @ViewBuilder
    func accessibilityTextTest(_ enabled: Bool) -> some View {
        if enabled { dynamicTypeSize(.accessibility3) }
        else { self }
    }
}
