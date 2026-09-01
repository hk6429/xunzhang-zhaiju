import XCTest
@testable import XunZhangZhaiJu

final class LocalProgressMergeEngineTests: XCTestCase {
    func testAuthoritativeCloudInkCanReflectConcurrentSpending() {
        var cloud = LocalAppProgress.fresh
        cloud.ink = 2
        var local = LocalAppProgress.fresh
        local.ink = 8

        let merged = LocalProgressMergeEngine.merge(cloud, local, authoritativeInk: cloud.ink)

        XCTAssertEqual(merged.ink, 2)
    }

    func testMergeKeepsCollectedProgressAndBestLevelResults() {
        var left = LocalAppProgress.fresh
        left.levels["1"] = LocalLevelProgress(stars: 3, found: ["p1"])
        left.collection = ["p1"]
        left.levelStats = ["1": LocalLevelStats(
            attempts: 3,
            completions: 1,
            bestStars: 3,
            bestDurationMs: 42_000,
            fewestMistakes: 2,
            modesCleared: [.standard],
            badges: ["insight"]
        )]

        var right = LocalAppProgress.fresh
        right.levels["1"] = LocalLevelProgress(stars: 2, found: ["p2"])
        right.collection = ["p2"]
        right.levelStats = ["1": LocalLevelStats(
            attempts: 1,
            completions: 1,
            bestStars: 2,
            bestDurationMs: 35_000,
            fewestMistakes: 0,
            modesCleared: [.challenge],
            badges: ["swift"]
        )]

        let merged = LocalProgressMergeEngine.merge(left, right)

        XCTAssertEqual(merged.levels["1"]?.stars, 3)
        XCTAssertEqual(merged.levels["1"]?.found, ["p1", "p2"])
        XCTAssertEqual(merged.collection, ["p1", "p2"])
        XCTAssertEqual(merged.levelStats?["1"]?.bestDurationMs, 35_000)
        XCTAssertEqual(merged.levelStats?["1"]?.fewestMistakes, 0)
        XCTAssertEqual(Set(merged.levelStats?["1"]?.modesCleared ?? []), [.standard, .challenge])
    }

    func testMergeKeepsKnownBestDurationWhenOtherDeviceHasNone() {
        var left = LocalAppProgress.fresh
        var stats = LocalLevelStats.fresh
        stats.bestDurationMs = 28_000
        left.levelStats = ["1": stats]

        var right = LocalAppProgress.fresh
        right.levelStats = ["1": .fresh]

        let merged = LocalProgressMergeEngine.merge(left, right)

        XCTAssertEqual(merged.levelStats?["1"]?.bestDurationMs, 28_000)
    }

    func testMergeRemovesMasteredPhraseFromWrongBook() {
        var left = LocalAppProgress.fresh
        left.wrongBook = ["p1"]
        left.mastery = ["p1": .fresh]
        var mastered = LocalPhraseMastery.fresh
        mastered.correctStreak = 2
        mastered.mastered = true
        var right = LocalAppProgress.fresh
        right.mastery = ["p1": mastered]

        let merged = LocalProgressMergeEngine.merge(left, right)

        XCTAssertEqual(merged.wrongBook, [])
        XCTAssertTrue(merged.mastery?["p1"]?.mastered == true)
    }

    func testMergeKeepsLaterExactReviewSchedule() {
        var left = LocalAppProgress.fresh
        var earlier = LocalPhraseMastery.fresh
        earlier.lastAnsweredAt = "2026-09-01T03:00:00Z"
        earlier.nextReviewAt = "2026-09-02T03:00:00.500Z"
        left.mastery = ["p1": earlier]

        var right = LocalAppProgress.fresh
        var later = LocalPhraseMastery.fresh
        later.lastAnsweredAt = "2026-09-01T04:00:00Z"
        later.nextReviewAt = "2026-09-04T04:00:00Z"
        right.mastery = ["p1": later]

        let merged = LocalProgressMergeEngine.merge(left, right)

        XCTAssertEqual(merged.mastery?["p1"]?.lastAnsweredAt, later.lastAnsweredAt)
        XCTAssertEqual(merged.mastery?["p1"]?.nextReviewAt, later.nextReviewAt)
    }

    func testMergeKeepsTheLatestHiddenEndingAnswer() {
        var left = LocalAppProgress.fresh
        left.world = .fresh
        left.world?.hiddenEnding = LocalHiddenEnding(choice: .single, answeredAt: 100)
        var right = LocalAppProgress.fresh
        right.world = .fresh
        right.world?.hiddenEnding = LocalHiddenEnding(choice: .people, answeredAt: 200)

        let merged = LocalProgressMergeEngine.merge(left, right)

        XCTAssertEqual(merged.world?.hiddenEnding, LocalHiddenEnding(choice: .people, answeredAt: 200))
    }
}
