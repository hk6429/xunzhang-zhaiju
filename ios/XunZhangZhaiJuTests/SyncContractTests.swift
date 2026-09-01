import XCTest
@testable import XunZhangZhaiJu

final class SyncContractTests: XCTestCase {
    func testSharedV1FixtureDecodesAndNeverContainsLocalPractice() throws {
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "progress-v1", withExtension: "json"))
        let data = try Data(contentsOf: url)
        let snapshot = try JSONDecoder().decode(LocalAppProgress.self, from: data)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(snapshot.v, 1)
        XCTAssertEqual(snapshot.levels["1"]?.stars, 3)
        XCTAssertNil(object["localPhrasePractice"])
    }

    func testLegacyLevelStatsWithoutBestDurationStillDecode() throws {
        let data = Data(#"{"attempts":1,"completions":1,"bestStars":3,"fewestMistakes":0,"modesCleared":["standard"],"badges":[]}"#.utf8)

        let stats = try JSONDecoder().decode(LocalLevelStats.self, from: data)

        XCTAssertNil(stats.bestDurationMs)
    }

    func testLevelStatsEncodeSharedBestDurationKey() throws {
        var stats = LocalLevelStats.fresh
        stats.bestDurationMs = 12_345

        let data = try JSONEncoder().encode(stats)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])

        XCTAssertEqual(object["bestDurationMs"] as? Int, 12_345)
    }

    func testLegacyMasteryWithoutExactTimestampsStillDecodes() throws {
        let data = Data(#"{"answered":1,"correct":0,"wrong":1,"correctStreak":0,"fillCorrect":0,"mastered":false,"lastAnsweredDateKey":"2026-09-01","nextReviewDateKey":"2026-09-01"}"#.utf8)

        let mastery = try JSONDecoder().decode(LocalPhraseMastery.self, from: data)

        XCTAssertNil(mastery.lastAnsweredAt)
        XCTAssertNil(mastery.nextReviewAt)
        XCTAssertTrue(ReviewSchedule.isDue(
            mastery,
            now: Date(timeIntervalSince1970: 0),
            dateKey: "2026-09-01"
        ))
    }
}
