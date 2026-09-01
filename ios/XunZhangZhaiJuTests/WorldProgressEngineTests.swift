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

    func testTrueEndingRequiresBossStarsLoreEventsAndCompleteTreasures() throws {
        let story = try ContentLoader().load().story
        let engine = WorldProgressEngine()
        var progress = LocalAppProgress.fresh
        progress.levels["50"] = LocalLevelProgress(stars: 1, found: ["p1"])

        let normal = engine.endingState(for: progress, story: story)
        XCTAssertTrue(normal.normalUnlocked)
        XCTAssertFalse(normal.trueRequirementsMet)
        XCTAssertEqual(normal.currentEndingID, story.endings.normal.id)
        XCTAssertFalse(normal.missingForTrue.isEmpty)

        progress = engine.preparingTrueEndingRequirements(from: story, in: progress)
        let ready = engine.endingState(for: progress, story: story)
        XCTAssertTrue(ready.hiddenLevelUnlocked)
        XCTAssertFalse(ready.hiddenLevelCompleted)
        XCTAssertEqual(ready.currentEndingID, story.endings.normal.id)

        progress = engine.recordingHiddenEnding(
            choice: .people,
            answeredAt: 1_788_192_000_000,
            in: progress
        )
        let completed = engine.endingState(for: progress, story: story)
        XCTAssertTrue(completed.hiddenLevelCompleted)
        XCTAssertEqual(completed.currentEndingID, story.endings.true.id)
    }

    func testTrueEndingDoesNotAcceptIncompleteTreasureFragments() throws {
        let story = try ContentLoader().load().story
        let engine = WorldProgressEngine()
        var progress = engine.preparingTrueEndingRequirements(from: story, in: .fresh)
        let treasureID = try XCTUnwrap(story.endings.true.requirements.treasuresAll?.first)
        progress.world?.treasures[treasureID]?.complete = false

        let state = engine.endingState(for: progress, story: story)

        XCTAssertFalse(state.trueRequirementsMet)
        XCTAssertTrue(state.missingForTrue.contains(.treasures([treasureID])))
    }

    func testTreasureAbilitiesRequireACompleteMatchingTreasure() throws {
        let story = try ContentLoader().load().story
        let engine = TreasureAbilityEngine()
        var progress = LocalAppProgress.fresh
        progress.world = .fresh
        let treasure = try XCTUnwrap(story.treasures.first { $0.ability == TreasureAbility.revealHiddenNode.rawValue })
        progress.world?.treasures[treasure.id] = LocalTreasureProgress(
            sources: ["level:4"],
            complete: false
        )

        XCTAssertFalse(engine.isActive(.revealHiddenNode, in: progress, story: story))

        progress.world?.treasures[treasure.id]?.complete = true
        XCTAssertTrue(engine.isActive(.revealHiddenNode, in: progress, story: story))
    }

    func testStoryTreasureAbilitiesMatchTheNativeAbilityCatalog() throws {
        let story = try ContentLoader().load().story

        XCTAssertEqual(
            Set(story.treasures.map(\.ability)),
            Set(TreasureAbility.allCases.map(\.rawValue))
        )
    }

    func testDashenBianRevealsTheNextUnseenEventInEachChapter() throws {
        let content = try ContentLoader().load()
        let engine = TreasureAbilityEngine()
        var progress = progressWithCompleteTreasure(.revealHiddenNode, story: content.story)

        XCTAssertEqual(
            engine.revealedEventLevelIDs(levels: content.levels, progress: progress, story: content.story),
            Set([2, 12, 22, 32, 42])
        )

        progress.world?.eventsSeen.append("c1-lore-crane-letter")
        let revealed = engine.revealedEventLevelIDs(
            levels: content.levels,
            progress: progress,
            story: content.story
        )
        XCTAssertFalse(revealed.contains(2))
        XCTAssertTrue(revealed.contains(4))
    }

    func testQiankunQuanOffersOneUnexploredSideRouteAfterMainChapterCompletion() throws {
        let content = try ContentLoader().load()
        let engine = TreasureAbilityEngine()
        var progress = progressWithCompleteTreasure(.openRouteShortcut, story: content.story)
        for level in content.levels where level.chapter == 1 && (level.routeType ?? .main) == .main {
            progress.levels[String(level.id)] = LocalLevelProgress(stars: 1, found: [])
        }

        XCTAssertEqual(
            engine.routeShortcuts(levels: content.levels, progress: progress, story: content.story).map(\.id),
            [2]
        )

        progress.levels["2"] = LocalLevelProgress(stars: 1, found: [])
        XCTAssertEqual(
            engine.routeShortcuts(levels: content.levels, progress: progress, story: content.story).map(\.id),
            [4]
        )
    }

    func testYinhunDengMarksADeterministicUnlockedDailyEncounterRegion() throws {
        let content = try ContentLoader().load()
        let engine = TreasureAbilityEngine()
        let progress = progressWithCompleteTreasure(.revealDailyEncounter, story: content.story)

        let first = engine.dailyEncounterLocation(
            levels: content.levels,
            progress: progress,
            story: content.story,
            dateKey: "2026-09-01"
        )
        let second = engine.dailyEncounterLocation(
            levels: content.levels,
            progress: progress,
            story: content.story,
            dateKey: "2026-09-01"
        )

        let chapter = try XCTUnwrap(content.story.chapters.first { $0.id == 1 })
        XCTAssertEqual(first, DailyEncounterLocation(chapter: 1, region: chapter.mapRegion))
        XCTAssertEqual(first, second)
    }

    func testSanjianLiangrenDaoPreviewsOnlyOncePerTaipeiDate() throws {
        let story = try ContentLoader().load().story
        let engine = TreasureAbilityEngine()
        let progress = progressWithCompleteTreasure(.previewEventChoice, story: story)

        XCTAssertTrue(engine.canPreviewEventChoices(dateKey: "2026-09-01", progress: progress, story: story))
        let used = engine.recordingEventChoicePreview(
            dateKey: "2026-09-01",
            in: progress,
            story: story
        )
        XCTAssertFalse(engine.canPreviewEventChoices(dateKey: "2026-09-01", progress: used, story: story))
        XCTAssertTrue(engine.canPreviewEventChoices(dateKey: "2026-09-02", progress: used, story: story))
    }

    func testZhuxianJianAbilityIsBackedByTheTrueEndingTreasure() throws {
        let story = try ContentLoader().load().story
        let progress = progressWithCompleteTreasure(.unlockTrueEnding, story: story)

        XCTAssertTrue(TreasureAbilityEngine().isActive(.unlockTrueEnding, in: progress, story: story))
    }

    private func progressWithCompleteTreasure(
        _ ability: TreasureAbility,
        story: StoryLore
    ) -> LocalAppProgress {
        var progress = LocalAppProgress.fresh
        progress.world = .fresh
        let treasureID = story.treasures.first { $0.ability == ability.rawValue }!.id
        progress.world?.treasures[treasureID] = LocalTreasureProgress(
            sources: ["test:1", "test:2"],
            complete: true
        )
        return progress
    }
}
