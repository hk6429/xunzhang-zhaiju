import XCTest
@testable import XunZhangZhaiJu

final class GameEngineTests: XCTestCase {
    func testLegalPhaseTransitionsReachCompletedAndTimedOut() throws {
        var completed = fixture()
        try GameReducer.reduce(state: &completed, action: .start)
        XCTAssertEqual(completed.phase, .running)
        try GameReducer.reduce(state: &completed, action: .foundPhrase("p1", revealed: false))
        try GameReducer.reduce(state: &completed, action: .foundPhrase("p2", revealed: false))
        XCTAssertEqual(completed.phase, .completed)
        XCTAssertEqual(completed.earnedStars, 3)

        var timed = fixture(timeLimitMilliseconds: 1_000)
        try GameReducer.reduce(state: &timed, action: .start)
        try GameReducer.reduce(state: &timed, action: .tick(milliseconds: 1_000))
        XCTAssertEqual(timed.phase, .timedOut)
    }

    func testKnowledgeQuizBackgroundAndSystemInterruptionsPauseCountdown() throws {
        for reason in PauseReason.allCases {
            var state = fixture(timeLimitMilliseconds: 10_000)
            try GameReducer.reduce(state: &state, action: .start)
            try GameReducer.reduce(state: &state, action: .pause(reason))
            try GameReducer.reduce(state: &state, action: .tick(milliseconds: 2_000))
            XCTAssertEqual(state.remainingMilliseconds, 10_000, "\(reason) 應暫停倒數")
            try GameReducer.reduce(state: &state, action: .resume(reason))
            try GameReducer.reduce(state: &state, action: .tick(milliseconds: 2_000))
            XCTAssertEqual(state.remainingMilliseconds, 8_000)
        }
    }

    func testRevealCapsStarsAtOneAndOtherHintsCapAtTwo() throws {
        var reveal = fixture()
        try complete(&reveal, hint: .reveal)
        XCTAssertEqual(reveal.earnedStars, 1)

        var circle = fixture()
        try complete(&circle, hint: .circle)
        XCTAssertEqual(circle.earnedStars, 2)

        var clean = fixture()
        try complete(&clean, hint: nil)
        XCTAssertEqual(clean.earnedStars, 3)
    }

    func testTimeoutRetryClearsRunButKeepsCollection() throws {
        var state = fixture(timeLimitMilliseconds: 1_000, collected: ["p-old"])
        try GameReducer.reduce(state: &state, action: .start)
        try GameReducer.reduce(state: &state, action: .foundPhrase("p1", revealed: false))
        try GameReducer.reduce(state: &state, action: .tick(milliseconds: 1_000))
        XCTAssertEqual(state.phase, .timedOut)
        XCTAssertTrue(state.collection.contains("p1"))

        try GameReducer.reduce(state: &state, action: .retry)
        XCTAssertEqual(state.phase, .running)
        XCTAssertTrue(state.foundPhraseIDs.isEmpty)
        XCTAssertEqual(state.collection, ["p-old", "p1"])
        XCTAssertEqual(state.remainingMilliseconds, 1_000)
    }

    func testSceneRebuildAndRotationDoNotResetRun() throws {
        var state = fixture(timeLimitMilliseconds: 10_000)
        try GameReducer.reduce(state: &state, action: .start)
        try GameReducer.reduce(state: &state, action: .foundPhrase("p1", revealed: false))
        try GameReducer.reduce(state: &state, action: .tick(milliseconds: 2_000))
        let before = state

        try GameReducer.reduce(state: &state, action: .sceneRebuilt)

        XCTAssertEqual(state, before)
    }

    func testLevelStatsOnlyReplaceBestDurationWithFasterCompletion() throws {
        var slower = fixture(timeLimitMilliseconds: 60_000)
        try GameReducer.reduce(state: &slower, action: .start)
        try GameReducer.reduce(state: &slower, action: .tick(milliseconds: 25_000))
        try GameReducer.reduce(state: &slower, action: .foundPhrase("p1", revealed: false))
        try GameReducer.reduce(state: &slower, action: .foundPhrase("p2", revealed: false))

        var faster = fixture(timeLimitMilliseconds: 60_000)
        try GameReducer.reduce(state: &faster, action: .start)
        try GameReducer.reduce(state: &faster, action: .tick(milliseconds: 18_000))
        try GameReducer.reduce(state: &faster, action: .foundPhrase("p1", revealed: false))
        try GameReducer.reduce(state: &faster, action: .foundPhrase("p2", revealed: false))

        var stats = LocalLevelStats.fresh
        stats.recordCompletion(from: slower)
        stats.recordCompletion(from: faster)
        stats.recordCompletion(from: slower)

        XCTAssertEqual(stats.completions, 3)
        XCTAssertEqual(stats.bestDurationMs, 18_000)
    }

    func testExplorationCompletionDoesNotInventBestDuration() throws {
        var state = fixture()
        try complete(&state, hint: nil)
        var stats = LocalLevelStats.fresh

        stats.recordCompletion(from: state)

        XCTAssertNil(stats.bestDurationMs)
    }

    func testIllegalActionsAreRejected() {
        var state = fixture()
        XCTAssertThrowsError(try GameReducer.reduce(state: &state, action: .tick(milliseconds: 1)))
        XCTAssertThrowsError(try GameReducer.reduce(state: &state, action: .retry))
    }

    private func fixture(
        timeLimitMilliseconds: Int? = nil,
        collected: Set<String> = []
    ) -> GameState {
        GameState(
            levelID: 1,
            targetPhraseIDs: ["p1", "p2"],
            timeLimitMilliseconds: timeLimitMilliseconds,
            collection: collected
        )
    }

    private func complete(_ state: inout GameState, hint: HintTier?) throws {
        try GameReducer.reduce(state: &state, action: .start)
        if let hint {
            try GameReducer.reduce(state: &state, action: .useHint(hint))
        }
        try GameReducer.reduce(state: &state, action: .foundPhrase("p1", revealed: hint == .reveal))
        try GameReducer.reduce(state: &state, action: .foundPhrase("p2", revealed: false))
    }
}
