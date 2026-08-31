import Combine
import Foundation

@MainActor
final class GameEngine: ObservableObject {
    @Published private(set) var state: GameState

    init(state: GameState) {
        self.state = state
    }

    func send(_ action: GameAction) throws {
        try GameReducer.reduce(state: &state, action: action)
    }
}
