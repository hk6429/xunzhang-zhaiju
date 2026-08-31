import Foundation

@MainActor
final class AppContainer: ObservableObject {
    @Published private(set) var isReady = true
}
