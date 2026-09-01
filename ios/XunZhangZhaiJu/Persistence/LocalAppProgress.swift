import Foundation

struct LocalLevelProgress: Codable, Equatable {
    var stars: Int
    var found: [String]
}

struct LocalDailyProgress: Codable, Equatable {
    var dateKey: String
    var quizAnswered: Int
    var quizCorrect: Int
    var rewardedPhraseIDs: [String]
    var completedLevelIDs: [Int]
    var foundPhraseIDs: [String]
    var completedDateKey: String?
    var quickBest: LocalQuickChallengeBest?

    static func fresh(dateKey: String) -> LocalDailyProgress {
        LocalDailyProgress(
            dateKey: dateKey,
            quizAnswered: 0,
            quizCorrect: 0,
            rewardedPhraseIDs: [],
            completedLevelIDs: [],
            foundPhraseIDs: [],
            completedDateKey: nil,
            quickBest: nil
        )
    }
}

struct LocalQuickChallengeBest: Codable, Equatable {
    var score: Int
    var durationMilliseconds: Int
}

struct LocalStreak: Codable, Equatable {
    var current: Int
    var best: Int
    var lastCompletedDateKey: String?
    var makeups: Int
    var makeupRefillDateKey: String?

    static let fresh = LocalStreak(
        current: 0,
        best: 0,
        lastCompletedDateKey: nil,
        makeups: 1,
        makeupRefillDateKey: nil
    )
}

struct LocalPhraseMastery: Codable, Equatable {
    var answered: Int
    var correct: Int
    var wrong: Int
    var correctStreak: Int
    var fillCorrect: Int
    var mastered: Bool
    var lastAnsweredDateKey: String?
    var nextReviewDateKey: String?

    static let fresh = LocalPhraseMastery(
        answered: 0,
        correct: 0,
        wrong: 0,
        correctStreak: 0,
        fillCorrect: 0,
        mastered: false,
        lastAnsweredDateKey: nil,
        nextReviewDateKey: nil
    )
}

struct LocalLevelStats: Codable, Equatable {
    var attempts: Int
    var completions: Int
    var bestStars: Int
    var bestDurationMs: Int?
    var fewestMistakes: Int?
    var modesCleared: [PlayMode]
    var badges: [String]

    static let fresh = LocalLevelStats(
        attempts: 0,
        completions: 0,
        bestStars: 0,
        bestDurationMs: nil,
        fewestMistakes: nil,
        modesCleared: [],
        badges: []
    )

    mutating func recordCompletion(from gameState: GameState) {
        guard gameState.phase == .completed else { return }
        completions += 1
        bestStars = max(bestStars, gameState.earnedStars ?? 0)
        fewestMistakes = min(fewestMistakes ?? gameState.mistakes, gameState.mistakes)
        if !modesCleared.contains(gameState.mode) { modesCleared.append(gameState.mode) }
        if let duration = gameState.completedDurationMilliseconds {
            bestDurationMs = min(bestDurationMs ?? duration, duration)
        }
    }
}

struct LocalActivity: Codable, Equatable {
    var levelsSinceRest: Int
    var sessionStartedAt: Date
    var lastRestAt: Date?

    static let fresh = LocalActivity(
        levelsSinceRest: 0,
        sessionStartedAt: Date(),
        lastRestAt: nil
    )
}

struct LocalTreasureProgress: Codable, Equatable {
    var sources: [String]
    var complete: Bool
}

enum HiddenEndingChoice: String, Codable, Equatable {
    case people
    case single
}

struct LocalHiddenEnding: Codable, Equatable {
    var choice: HiddenEndingChoice
    var answeredAt: Int64
}

struct LocalWorldProgress: Codable, Equatable {
    var eventsSeen: [String]
    var loreUnlocked: [String]
    var treasures: [String: LocalTreasureProgress]
    var effects: [String: Int]
    var hiddenEnding: LocalHiddenEnding?

    static let fresh = LocalWorldProgress(
        eventsSeen: [],
        loreUnlocked: [],
        treasures: [:],
        effects: [:],
        hiddenEnding: nil
    )
}

struct LocalAppProgress: Codable, Equatable {
    var v: Int
    var levels: [String: LocalLevelProgress]
    var ink: Int
    var collection: [String]
    var daily: LocalDailyProgress?
    var mastery: [String: LocalPhraseMastery]?
    var wrongBook: [String]?
    var streak: LocalStreak?
    var activeRun: GameState?
    var levelStats: [String: LocalLevelStats]?
    var activity: LocalActivity?
    var world: LocalWorldProgress?

    static let fresh = LocalAppProgress(
        v: 1,
        levels: [:],
        ink: 3,
        collection: [],
        daily: nil,
        mastery: nil,
        wrongBook: nil,
        streak: nil,
        activeRun: nil,
        levelStats: nil,
        activity: nil,
        world: nil
    )
}
