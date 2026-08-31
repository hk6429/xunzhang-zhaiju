import Foundation

struct DailyProgressEngine {
    func recordingQuiz(
        in progress: LocalAppProgress,
        dateKey: String,
        phraseID: String,
        kind: LearningQuestionKind,
        correct: Bool
    ) -> LocalAppProgress {
        var next = progress
        var daily = currentDaily(from: progress, dateKey: dateKey)
        daily.quizAnswered += 1
        if correct {
            daily.quizCorrect += 1
            if !daily.rewardedPhraseIDs.contains(phraseID) {
                daily.rewardedPhraseIDs.append(phraseID)
                next.ink = min(30, next.ink + (kind == .fill ? 2 : 1))
            }
        }
        next.daily = daily
        return next
    }

    func recordingGame(
        in progress: LocalAppProgress,
        dateKey: String,
        gameState: GameState
    ) -> LocalAppProgress {
        var next = progress
        var daily = currentDaily(from: progress, dateKey: dateKey)
        daily.foundPhraseIDs = orderedUnion(
            daily.foundPhraseIDs,
            Array(gameState.foundPhraseIDs).sorted()
        )
        if gameState.phase == .completed, !daily.completedLevelIDs.contains(gameState.levelID) {
            daily.completedLevelIDs.append(gameState.levelID)
        }
        next.daily = daily
        return next
    }

    private func currentDaily(from progress: LocalAppProgress, dateKey: String) -> LocalDailyProgress {
        guard let daily = progress.daily, daily.dateKey == dateKey else {
            return .fresh(dateKey: dateKey)
        }
        return daily
    }

    private func orderedUnion(_ left: [String], _ right: [String]) -> [String] {
        var seen = Set<String>()
        return (left + right).filter { seen.insert($0).inserted }
    }
}
