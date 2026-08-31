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
}
