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

    static func fresh(dateKey: String) -> LocalDailyProgress {
        LocalDailyProgress(
            dateKey: dateKey,
            quizAnswered: 0,
            quizCorrect: 0,
            rewardedPhraseIDs: [],
            completedLevelIDs: [],
            foundPhraseIDs: []
        )
    }
}

struct LocalAppProgress: Codable, Equatable {
    var v: Int
    var levels: [String: LocalLevelProgress]
    var ink: Int
    var collection: [String]
    var daily: LocalDailyProgress?

    static let fresh = LocalAppProgress(v: 1, levels: [:], ink: 3, collection: [], daily: nil)
}
