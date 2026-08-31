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
        var mastery = next.mastery ?? [:]
        var item = mastery[phraseID] ?? .fresh
        item.answered += 1
        item.lastAnsweredDateKey = dateKey
        var wrongBook = next.wrongBook ?? []
        if correct {
            item.correct += 1
            item.correctStreak += 1
            if kind == .fill { item.fillCorrect += 1 }
            item.mastered = item.correctStreak >= 3 && item.fillCorrect >= 1
            let ladder = [1, 3, 7, 14, 30]
            let days = ladder[min(ladder.count - 1, max(0, item.correctStreak - 1))]
            item.nextReviewDateKey = TaiwanDate.adding(days: days, to: dateKey)
            if item.correctStreak >= 2 {
                wrongBook.removeAll { $0 == phraseID }
            }
        } else {
            item.wrong += 1
            item.correctStreak = 0
            item.mastered = false
            item.nextReviewDateKey = dateKey
            if !wrongBook.contains(phraseID) { wrongBook.append(phraseID) }
        }
        mastery[phraseID] = item
        next.mastery = mastery
        next.wrongBook = wrongBook
        next.daily = daily
        completeDailyIfNeeded(&next, dateKey: dateKey)
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
        completeDailyIfNeeded(&next, dateKey: dateKey)
        return next
    }

    func recordingQuickChallenge(
        in progress: LocalAppProgress,
        dateKey: String,
        score: Int,
        durationMilliseconds: Int
    ) -> LocalAppProgress {
        var next = progress
        var daily = currentDaily(from: progress, dateKey: dateKey)
        let candidate = LocalQuickChallengeBest(
            score: max(0, score),
            durationMilliseconds: max(0, durationMilliseconds)
        )
        let previous = daily.quickBest
        if previous == nil || candidate.score > previous!.score
            || (candidate.score == previous!.score
                && candidate.durationMilliseconds < previous!.durationMilliseconds) {
            daily.quickBest = candidate
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

    private func completeDailyIfNeeded(_ progress: inout LocalAppProgress, dateKey: String) {
        guard var daily = progress.daily,
              daily.completedDateKey == nil,
              dailyQuestsAreComplete(daily, dateKey: dateKey) else { return }
        daily.completedDateKey = dateKey
        progress.daily = daily

        var streak = progress.streak ?? .fresh
        let weekAnchor = TaiwanDate.monday(of: dateKey)
        if streak.makeupRefillDateKey != weekAnchor {
            streak.makeups = min(2, streak.makeups + 1)
            streak.makeupRefillDateKey = weekAnchor
        }
        let yesterday = TaiwanDate.adding(days: -1, to: dateKey)
        let previousSchoolDay = TaiwanDate.previousSchoolDay(before: dateKey)
        var continued = streak.lastCompletedDateKey == yesterday
            || streak.lastCompletedDateKey == previousSchoolDay
        if !continued,
           streak.lastCompletedDateKey == TaiwanDate.adding(days: -2, to: dateKey),
           streak.makeups > 0 {
            streak.makeups -= 1
            continued = true
        }
        streak.current = continued ? streak.current + 1 : 1
        streak.best = max(streak.best, streak.current)
        streak.lastCompletedDateKey = dateKey
        progress.streak = streak
    }

    private func dailyQuestsAreComplete(_ daily: LocalDailyProgress, dateKey: String) -> Bool {
        NativeParityRules.dailyQuestIDs(dateKey: dateKey).allSatisfy { id in
            switch id {
            case "clear-level": daily.completedLevelIDs.count >= 1
            case "clear-level-2": daily.completedLevelIDs.count >= 2
            case "quiz-correct-3": daily.quizCorrect >= 3
            case "quiz-correct": daily.quizCorrect >= 5
            case "quiz-correct-7": daily.quizCorrect >= 7
            case "find-phrases": daily.foundPhraseIDs.count >= 3
            case "find-phrases-5": daily.foundPhraseIDs.count >= 5
            default: false
            }
        }
    }
}
