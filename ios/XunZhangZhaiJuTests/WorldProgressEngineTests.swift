import XCTest
@testable import XunZhangZhaiJu

final class WorldProgressEngineTests: XCTestCase {
    func testEventEffectsAreAppliedOnlyOnce() throws {
        let content = try ContentLoader().load()
        let event = try XCTUnwrap(content.events.events.first)
        let choice = try XCTUnwrap(event.choices.first)
        let engine = WorldProgressEngine()

        let first = engine.applying(
            effects: choice.effect,
            eventID: event.id,
            to: .fresh
        )
        let repeated = engine.applying(
            effects: choice.effect,
            eventID: event.id,
            to: first
        )

        XCTAssertEqual(first, repeated)
        XCTAssertEqual(first.world?.eventsSeen, [event.id])
        XCTAssertFalse(first.world?.loreUnlocked.isEmpty ?? true)
    }

    func testLevelTreasureUsesUniqueSourcesAndCompletesAtSecondFragment() {
        let engine = WorldProgressEngine()
        let firstReward = TreasureReward(id: "dashen-bian", shard: 1, completesItem: false)
        let secondReward = TreasureReward(id: "dashen-bian", shard: 2, completesItem: true)

        var progress = engine.grantingLevelTreasure(firstReward, levelID: 4, to: .fresh)
        progress = engine.grantingLevelTreasure(firstReward, levelID: 4, to: progress)
        XCTAssertEqual(progress.world?.treasures["dashen-bian"]?.sources, ["level:4"])
        XCTAssertEqual(progress.world?.treasures["dashen-bian"]?.complete, false)

        progress = engine.grantingLevelTreasure(secondReward, levelID: 8, to: progress)
        XCTAssertEqual(progress.world?.treasures["dashen-bian"]?.sources.count, 2)
        XCTAssertEqual(progress.world?.treasures["dashen-bian"]?.complete, true)
    }

    func testStudyEffectsReturnTheirQuestionCountWithoutCountingOtherRewards() {
        let effects = [
            EventEffect(type: .study, value: "circle", amount: 2, uses: nil),
            EventEffect(type: .study, value: "bonus", amount: nil, uses: nil),
            EventEffect(type: .mapReveal, value: "chapter-1-hidden", amount: 99, uses: nil),
        ]

        XCTAssertEqual(WorldProgressEngine().studyQuestionCount(for: effects), 3)
    }
}
