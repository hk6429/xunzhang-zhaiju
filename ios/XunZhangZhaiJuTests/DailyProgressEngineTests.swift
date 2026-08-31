import XCTest
@testable import XunZhangZhaiJu

final class DailyProgressEngineTests: XCTestCase {
    func testLegacyProgressWithoutDailyFieldStillDecodes() throws {
        let data = Data(#"{"v":1,"levels":{},"ink":3,"collection":[]}"#.utf8)

        let progress = try JSONDecoder().decode(LocalAppProgress.self, from: data)

        XCTAssertEqual(progress, .fresh)
    }

    func testCorrectQuizRewardsEachPhraseOnlyOnceAndCapsInk() {
        let engine = DailyProgressEngine()
        var progress = LocalAppProgress.fresh
        progress.ink = 29

        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .fill,
            correct: true
        )
        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .fill,
            correct: true
        )

        XCTAssertEqual(progress.ink, 30)
        XCTAssertEqual(progress.daily?.quizAnswered, 2)
        XCTAssertEqual(progress.daily?.quizCorrect, 2)
        XCTAssertEqual(progress.daily?.rewardedPhraseIDs, ["p1"])
    }

    func testNewTaipeiDayResetsDailyCounters() {
        let engine = DailyProgressEngine()
        var progress = engine.recordingQuiz(
            in: .fresh,
            dateKey: "2026-08-31",
            phraseID: "p1",
            kind: .choice,
            correct: true
        )

        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p2",
            kind: .choice,
            correct: false
        )

        XCTAssertEqual(progress.daily?.dateKey, "2026-09-01")
        XCTAssertEqual(progress.daily?.quizAnswered, 1)
        XCTAssertEqual(progress.daily?.quizCorrect, 0)
        XCTAssertEqual(progress.daily?.rewardedPhraseIDs, [])
    }

    func testGameUpdatesUniqueDailyLevelAndPhraseProgress() {
        let engine = DailyProgressEngine()
        var game = GameState(
            levelID: 7,
            targetPhraseIDs: ["p1", "p2"],
            timeLimitMilliseconds: nil
        )
        game.phase = .completed
        game.foundPhraseIDs = ["p1", "p2"]

        var progress = engine.recordingGame(
            in: .fresh,
            dateKey: "2026-09-01",
            gameState: game
        )
        progress = engine.recordingGame(
            in: progress,
            dateKey: "2026-09-01",
            gameState: game
        )

        XCTAssertEqual(progress.daily?.completedLevelIDs, [7])
        XCTAssertEqual(progress.daily?.foundPhraseIDs, ["p1", "p2"])
    }

    func testWrongBookAndMasteryFollowSpacedReviewRules() {
        let engine = DailyProgressEngine()
        var progress = engine.recordingQuiz(
            in: .fresh,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .choice,
            correct: false
        )
        XCTAssertEqual(progress.wrongBook, ["p1"])
        XCTAssertEqual(progress.mastery?["p1"]?.nextReviewDateKey, "2026-09-01")

        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .choice,
            correct: true
        )
        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .fill,
            correct: true
        )
        XCTAssertEqual(progress.wrongBook, [])
        XCTAssertEqual(progress.mastery?["p1"]?.mastered, false)

        progress = engine.recordingQuiz(
            in: progress,
            dateKey: "2026-09-01",
            phraseID: "p1",
            kind: .choice,
            correct: true
        )
        XCTAssertEqual(progress.mastery?["p1"]?.mastered, true)
        XCTAssertEqual(progress.mastery?["p1"]?.nextReviewDateKey, "2026-09-08")
    }

    func testTaipeiDateAdditionCrossesMonthBoundary() {
        XCTAssertEqual(TaiwanDate.adding(days: 1, to: "2026-08-31"), "2026-09-01")
    }

    func testCompletingThreeDailyQuestsBuildsSchoolDayStreak() {
        let engine = DailyProgressEngine()
        var progress = fulfillDaily(.fresh, dateKey: "2026-09-04", engine: engine)
        XCTAssertEqual(progress.streak?.current, 1)

        progress = fulfillDaily(progress, dateKey: "2026-09-07", engine: engine)
        XCTAssertEqual(progress.streak?.current, 2)
        XCTAssertEqual(progress.streak?.best, 2)
        XCTAssertEqual(progress.streak?.lastCompletedDateKey, "2026-09-07")
    }

    func testQuickChallengeBestOnlyImproves() {
        let engine = DailyProgressEngine()
        var progress = engine.recordingQuickChallenge(
            in: .fresh,
            dateKey: "2026-09-01",
            score: 4,
            durationMilliseconds: 30_000
        )
        progress = engine.recordingQuickChallenge(
            in: progress,
            dateKey: "2026-09-01",
            score: 3,
            durationMilliseconds: 10_000
        )
        XCTAssertEqual(progress.daily?.quickBest?.score, 4)

        progress = engine.recordingQuickChallenge(
            in: progress,
            dateKey: "2026-09-01",
            score: 4,
            durationMilliseconds: 20_000
        )
        XCTAssertEqual(progress.daily?.quickBest?.durationMilliseconds, 20_000)
    }

    private func fulfillDaily(
        _ initial: LocalAppProgress,
        dateKey: String,
        engine: DailyProgressEngine
    ) -> LocalAppProgress {
        var progress = initial
        for index in 0..<7 {
            progress = engine.recordingQuiz(
                in: progress,
                dateKey: dateKey,
                phraseID: "quiz-\(index)",
                kind: index == 0 ? .fill : .choice,
                correct: true
            )
        }
        for levelID in 1...2 {
            var game = GameState(
                levelID: levelID,
                targetPhraseIDs: ["p1", "p2", "p3", "p4", "p5"],
                timeLimitMilliseconds: nil
            )
            game.phase = .completed
            game.foundPhraseIDs = ["p1", "p2", "p3", "p4", "p5"]
            progress = engine.recordingGame(
                in: progress,
                dateKey: dateKey,
                gameState: game
            )
        }
        return progress
    }
}
