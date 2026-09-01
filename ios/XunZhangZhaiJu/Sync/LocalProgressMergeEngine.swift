import Foundation

enum LocalProgressMergeEngine {
    static func merge(
        _ left: LocalAppProgress,
        _ right: LocalAppProgress,
        authoritativeInk: Int? = nil
    ) -> LocalAppProgress {
        let mastery = mergeMastery(left.mastery ?? [:], right.mastery ?? [:])
        return LocalAppProgress(
            v: max(left.v, right.v),
            levels: mergeLevels(left.levels, right.levels),
            ink: max(0, authoritativeInk ?? max(left.ink, right.ink)),
            collection: union(left.collection, right.collection),
            daily: mergeDaily(left.daily, right.daily),
            mastery: mastery,
            wrongBook: union(left.wrongBook ?? [], right.wrongBook ?? []).filter {
                (mastery[$0]?.correctStreak ?? 0) < 2
            },
            streak: mergeStreak(left.streak, right.streak),
            activeRun: right.activeRun ?? left.activeRun,
            levelStats: mergeLevelStats(left.levelStats ?? [:], right.levelStats ?? [:]),
            activity: right.activity ?? left.activity,
            world: mergeWorld(left.world, right.world)
        )
    }

    private static func mergeLevels(
        _ left: [String: LocalLevelProgress],
        _ right: [String: LocalLevelProgress]
    ) -> [String: LocalLevelProgress] {
        var result = left
        for (key, value) in right {
            let previous = result[key] ?? LocalLevelProgress(stars: 0, found: [])
            result[key] = LocalLevelProgress(
                stars: max(previous.stars, value.stars),
                found: union(previous.found, value.found)
            )
        }
        return result
    }

    private static func mergeDaily(_ left: LocalDailyProgress?, _ right: LocalDailyProgress?) -> LocalDailyProgress? {
        guard let left else { return right }
        guard let right else { return left }
        guard left.dateKey == right.dateKey else { return left.dateKey > right.dateKey ? left : right }
        return LocalDailyProgress(
            dateKey: left.dateKey,
            quizAnswered: max(left.quizAnswered, right.quizAnswered),
            quizCorrect: max(left.quizCorrect, right.quizCorrect),
            rewardedPhraseIDs: union(left.rewardedPhraseIDs, right.rewardedPhraseIDs),
            completedLevelIDs: union(left.completedLevelIDs, right.completedLevelIDs),
            foundPhraseIDs: union(left.foundPhraseIDs, right.foundPhraseIDs),
            completedDateKey: later(left.completedDateKey, right.completedDateKey),
            quickBest: better(left.quickBest, right.quickBest)
        )
    }

    private static func mergeMastery(
        _ left: [String: LocalPhraseMastery],
        _ right: [String: LocalPhraseMastery]
    ) -> [String: LocalPhraseMastery] {
        var result = left
        for (key, value) in right {
            guard let previous = result[key] else { result[key] = value; continue }
            result[key] = LocalPhraseMastery(
                answered: max(previous.answered, value.answered),
                correct: max(previous.correct, value.correct),
                wrong: max(previous.wrong, value.wrong),
                correctStreak: max(previous.correctStreak, value.correctStreak),
                fillCorrect: max(previous.fillCorrect, value.fillCorrect),
                mastered: previous.mastered || value.mastered,
                lastAnsweredDateKey: later(previous.lastAnsweredDateKey, value.lastAnsweredDateKey),
                nextReviewDateKey: later(previous.nextReviewDateKey, value.nextReviewDateKey),
                lastAnsweredAt: ReviewSchedule.later(previous.lastAnsweredAt, value.lastAnsweredAt),
                nextReviewAt: ReviewSchedule.later(previous.nextReviewAt, value.nextReviewAt)
            )
        }
        return result
    }

    private static func mergeStreak(_ left: LocalStreak?, _ right: LocalStreak?) -> LocalStreak? {
        guard let left else { return right }
        guard let right else { return left }
        let latest = (left.lastCompletedDateKey ?? "") >= (right.lastCompletedDateKey ?? "") ? left : right
        return LocalStreak(
            current: latest.current,
            best: max(left.best, right.best),
            lastCompletedDateKey: later(left.lastCompletedDateKey, right.lastCompletedDateKey),
            makeups: max(left.makeups, right.makeups),
            makeupRefillDateKey: later(left.makeupRefillDateKey, right.makeupRefillDateKey)
        )
    }

    private static func mergeLevelStats(
        _ left: [String: LocalLevelStats],
        _ right: [String: LocalLevelStats]
    ) -> [String: LocalLevelStats] {
        var result = left
        for (key, value) in right {
            guard let previous = result[key] else { result[key] = value; continue }
            result[key] = LocalLevelStats(
                attempts: max(previous.attempts, value.attempts),
                completions: max(previous.completions, value.completions),
                bestStars: max(previous.bestStars, value.bestStars),
                bestDurationMs: minimum(previous.bestDurationMs, value.bestDurationMs),
                fewestMistakes: minimum(previous.fewestMistakes, value.fewestMistakes),
                modesCleared: union(previous.modesCleared, value.modesCleared),
                badges: union(previous.badges, value.badges)
            )
        }
        return result
    }

    private static func mergeWorld(_ left: LocalWorldProgress?, _ right: LocalWorldProgress?) -> LocalWorldProgress? {
        guard let left else { return right }
        guard let right else { return left }
        var treasures = left.treasures
        for (key, value) in right.treasures {
            let previous = treasures[key] ?? LocalTreasureProgress(sources: [], complete: false)
            treasures[key] = LocalTreasureProgress(
                sources: union(previous.sources, value.sources),
                complete: previous.complete || value.complete
            )
        }
        var effects = left.effects
        for (key, value) in right.effects { effects[key] = max(effects[key] ?? 0, value) }
        return LocalWorldProgress(
            eventsSeen: union(left.eventsSeen, right.eventsSeen),
            loreUnlocked: union(left.loreUnlocked, right.loreUnlocked),
            treasures: treasures,
            effects: effects,
            hiddenEnding: later(left.hiddenEnding, right.hiddenEnding)
        )
    }

    private static func later(
        _ left: LocalHiddenEnding?,
        _ right: LocalHiddenEnding?
    ) -> LocalHiddenEnding? {
        guard let left else { return right }
        guard let right else { return left }
        return left.answeredAt > right.answeredAt ? left : right
    }

    private static func better(_ left: LocalQuickChallengeBest?, _ right: LocalQuickChallengeBest?) -> LocalQuickChallengeBest? {
        guard let left else { return right }
        guard let right else { return left }
        if left.score != right.score { return left.score > right.score ? left : right }
        return left.durationMilliseconds <= right.durationMilliseconds ? left : right
    }

    private static func later(_ left: String?, _ right: String?) -> String? {
        [left, right].compactMap { $0 }.max()
    }

    private static func minimum(_ left: Int?, _ right: Int?) -> Int? {
        [left, right].compactMap { $0 }.min()
    }

    private static func union<T: Hashable>(_ left: [T], _ right: [T]) -> [T] {
        var seen = Set<T>()
        return (left + right).filter { seen.insert($0).inserted }
    }
}
