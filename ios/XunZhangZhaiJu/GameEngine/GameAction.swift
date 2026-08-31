import Foundation

enum GameAction: Equatable {
    case start
    case pause(PauseReason)
    case resume(PauseReason)
    case tick(milliseconds: Int)
    case foundPhrase(String, revealed: Bool)
    case useHint(HintTier)
    case recordMistake
    case retry
    case sceneRebuilt
}
