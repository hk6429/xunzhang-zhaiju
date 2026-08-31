import Foundation

enum GamePhase: String, Codable, Equatable {
    case preparing
    case running
    case completed
    case timedOut
}

enum PauseReason: String, Codable, CaseIterable, Hashable {
    case knowledgeCard
    case learningQuiz
    case background
    case systemInterruption
}

enum HintTier: String, Codable, CaseIterable, Hashable {
    case circle
    case flash
    case reveal
}

struct GameState: Codable, Equatable {
    var levelID: Int
    var mode: PlayMode
    var targetPhraseIDs: Set<String>
    var phase: GamePhase
    var pauseReasons: Set<PauseReason>
    var initialTimeLimitMilliseconds: Int?
    var remainingMilliseconds: Int?
    var foundPhraseIDs: Set<String>
    var revealedPhraseIDs: Set<String>
    var collection: Set<String>
    var hintsUsed: Int
    var usedHint: Bool
    var usedReveal: Bool
    var mistakes: Int
    var earnedStars: Int?
    var treasureReward: TreasureReward?

    init(
        levelID: Int,
        targetPhraseIDs: Set<String>,
        timeLimitMilliseconds: Int?,
        collection: Set<String> = [],
        mode: PlayMode = .standard,
        treasureReward: TreasureReward? = nil
    ) {
        self.levelID = levelID
        self.mode = mode
        self.targetPhraseIDs = targetPhraseIDs
        phase = .preparing
        pauseReasons = []
        initialTimeLimitMilliseconds = timeLimitMilliseconds
        remainingMilliseconds = timeLimitMilliseconds
        foundPhraseIDs = []
        revealedPhraseIDs = []
        self.collection = collection
        hintsUsed = 0
        usedHint = false
        usedReveal = false
        mistakes = 0
        earnedStars = nil
        self.treasureReward = treasureReward
    }

    var isCountdownActive: Bool {
        phase == .running && pauseReasons.isEmpty && remainingMilliseconds != nil
    }
}
