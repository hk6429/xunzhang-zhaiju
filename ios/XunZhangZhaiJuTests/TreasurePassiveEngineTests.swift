import XCTest
@testable import XunZhangZhaiJu

final class TreasurePassiveEngineTests: XCTestCase {
    func testCatalogMatchesTheTenWebPassiveTreasureIDs() {
        XCTAssertEqual(
            TreasurePassiveEngine.catalog.map(\.id),
            [
                "dashanbian_shard",
                "qiankunquan_shard",
                "sanjianliangren_shard",
                "yinhundeng_shard",
                "zhuxianjian_shard",
                "zhenzhi_shard",
                "chengxin-zhi_shard",
                "zihao-bi_shard",
                "tinggui-mo_shard",
                "duanxi-yan_shard",
            ]
        )
        XCTAssertEqual(TreasurePassiveEngine.catalog.map(\.chapter), Array(1...10))
        XCTAssertEqual(Set(TreasurePassiveEngine.catalog.map(\.effect)), Set(TreasurePassiveEffect.allCases))
    }

    func testEveryUniqueLevelGrantsOneChapterFragmentAndTenCompleteTheTreasure() throws {
        let engine = TreasurePassiveEngine()
        var progress = LocalAppProgress.fresh
        for levelID in 1...10 {
            progress = engine.grantingChapterFragment(chapter: 1, levelID: levelID, to: progress)
        }
        progress = engine.grantingChapterFragment(chapter: 1, levelID: 10, to: progress)

        let passive = try XCTUnwrap(engine.passive(forChapter: 1))
        let item = try XCTUnwrap(progress.world?.treasures[passive.id])
        XCTAssertEqual(item.sources, (1...10).map { "level:\($0)" })
        XCTAssertTrue(item.complete)
        XCTAssertTrue(engine.isComplete(passive, in: progress))
    }

    func testCompletedPassivesAccumulateAllFiveBonusDimensions() {
        let engine = TreasurePassiveEngine()
        var progress = LocalAppProgress.fresh
        var world = LocalWorldProgress.fresh
        for passive in TreasurePassiveEngine.catalog {
            world.treasures[passive.id] = LocalTreasureProgress(sources: [], complete: true)
        }
        progress.world = world

        XCTAssertEqual(
            engine.bonuses(in: progress),
            TreasurePassiveBonuses(
                extraTimeSeconds: 35,
                comboThresholdReduction: 2,
                reviewSlots: 5,
                secondChances: 2,
                extraClues: 2
            )
        )
        XCTAssertEqual(engine.reviewLimit(in: progress), 10)
    }

    func testExistingCompletedLevelsBackfillPassiveFragments() throws {
        let content = try ContentLoader().load()
        var progress = LocalAppProgress.fresh
        for levelID in 1...10 {
            progress.levels[String(levelID)] = LocalLevelProgress(stars: 1, found: [])
        }

        let reconciled = TreasurePassiveEngine().reconcilingCompletedLevels(
            content.levels,
            in: progress
        )

        let passive = try XCTUnwrap(TreasurePassiveEngine().passive(forChapter: 1))
        XCTAssertEqual(reconciled.world?.treasures[passive.id]?.sources.count, 10)
        XCTAssertEqual(reconciled.world?.treasures[passive.id]?.complete, true)
    }

    func testStoryTreasureDoesNotActivateLegacyPassiveBonus() {
        var progress = LocalAppProgress.fresh
        progress.world = .fresh
        progress.world?.treasures["dashen-bian"] = LocalTreasureProgress(
            sources: ["level:4", "level:8"],
            complete: true
        )

        XCTAssertEqual(TreasurePassiveEngine().bonuses(in: progress), .none)
    }

    func testChoiceSecondChanceRemovesTwoWrongOptionsBeforeFinalizing() {
        let engine = TreasurePassiveEngine()
        let first = engine.choiceSecondChanceDecision(
            given: "錯一",
            answer: "正解",
            options: ["正解", "錯一", "錯二", "錯三"],
            usedChances: 0,
            extraChances: 0,
            disabledOptions: []
        )

        XCTAssertFalse(first.shouldFinalize)
        XCTAssertEqual(first.usedChances, 1)
        XCTAssertEqual(first.disabledOptions, ["錯一", "錯二"])

        let exhausted = engine.choiceSecondChanceDecision(
            given: "錯三",
            answer: "正解",
            options: ["正解", "錯一", "錯二", "錯三"],
            usedChances: first.usedChances,
            extraChances: 0,
            disabledOptions: first.disabledOptions
        )
        XCTAssertTrue(exhausted.shouldFinalize)
    }

    func testPassiveChoiceSecondChanceExtendsTheRetryLimit() {
        let decision = TreasurePassiveEngine().choiceSecondChanceDecision(
            given: "錯三",
            answer: "正解",
            options: ["正解", "錯一", "錯二", "錯三"],
            usedChances: 1,
            extraChances: 1,
            disabledOptions: ["錯一", "錯二"]
        )

        XCTAssertFalse(decision.shouldFinalize)
        XCTAssertEqual(decision.usedChances, 2)
        XCTAssertTrue(decision.disabledOptions.contains("錯三"))
    }
}
