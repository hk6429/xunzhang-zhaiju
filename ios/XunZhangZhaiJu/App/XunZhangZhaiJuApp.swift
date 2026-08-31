import SwiftUI

@main
struct XunZhangZhaiJuApp: App {
    @StateObject private var container = AppContainer()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(container)
                .tint(AppTheme.accent)
                .preferredColorScheme(.dark)
        }
    }
}
