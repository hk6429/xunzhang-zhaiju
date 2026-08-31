import Foundation

enum GameReducerError: LocalizedError, Equatable {
    case illegalAction(GameAction, phase: GamePhase)
    case unknownPhrase(String)

    var errorDescription: String? {
        switch self {
        case let .illegalAction(action, phase):
            "遊戲階段 \(phase.rawValue) 不接受動作 \(String(describing: action))"
        case let .unknownPhrase(id):
            "不是本關目標語料：\(id)"
        }
    }
}

enum GameReducer {
    static func reduce(state: inout GameState, action: GameAction) throws {
        switch action {
        case .start:
            guard state.phase == .preparing else { throw illegal(action, state) }
            state.phase = .running

        case let .pause(reason):
            guard state.phase == .running else { throw illegal(action, state) }
            state.pauseReasons.insert(reason)

        case let .resume(reason):
            guard state.phase == .running, state.pauseReasons.contains(reason) else {
                throw illegal(action, state)
            }
            state.pauseReasons.remove(reason)

        case let .tick(milliseconds):
            guard state.phase == .running else { throw illegal(action, state) }
            guard milliseconds >= 0 else { throw illegal(action, state) }
            guard state.pauseReasons.isEmpty, let remaining = state.remainingMilliseconds else { return }
            state.remainingMilliseconds = max(0, remaining - milliseconds)
            if state.remainingMilliseconds == 0 {
                state.phase = .timedOut
                state.pauseReasons.removeAll()
            }

        case let .foundPhrase(id, revealed):
            guard state.phase == .running else { throw illegal(action, state) }
            guard state.targetPhraseIDs.contains(id) else { throw GameReducerError.unknownPhrase(id) }
            guard state.foundPhraseIDs.insert(id).inserted else { return }
            if revealed {
                state.revealedPhraseIDs.insert(id)
                state.usedReveal = true
            } else {
                state.collection.insert(id)
            }
            if state.foundPhraseIDs == state.targetPhraseIDs {
                state.phase = .completed
                state.pauseReasons.removeAll()
                state.earnedStars = NativeParityRules.stars(
                    usedReveal: state.usedReveal,
                    usedHint: state.usedHint,
                    maxStars: 3
                )
            }

        case let .useHint(tier):
            guard state.phase == .running else { throw illegal(action, state) }
            state.hintsUsed += 1
            if tier == .reveal {
                state.usedReveal = true
            } else {
                state.usedHint = true
            }

        case .recordMistake:
            guard state.phase == .running else { throw illegal(action, state) }
            state.mistakes += 1

        case .retry:
            guard state.phase == .timedOut else { throw illegal(action, state) }
            state.phase = .running
            state.pauseReasons.removeAll()
            state.remainingMilliseconds = state.initialTimeLimitMilliseconds
            state.foundPhraseIDs.removeAll()
            state.revealedPhraseIDs.removeAll()
            state.hintsUsed = 0
            state.usedHint = false
            state.usedReveal = false
            state.mistakes = 0
            state.earnedStars = nil

        case .sceneRebuilt:
            break
        }
    }

    private static func illegal(_ action: GameAction, _ state: GameState) -> GameReducerError {
        .illegalAction(action, phase: state.phase)
    }
}
